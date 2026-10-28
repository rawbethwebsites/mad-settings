// Camper accounts: sign up free with phone + password, and a spend-only wallet topped up by bank transfer.
import { ConvexError, v } from 'convex/values';
import { action, internalMutation, internalQuery, mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import { accountByKey, bank, charge, cleanAmount, cleanPhone, requireAccount, staffRole } from './walletLib';
import { TENTS_TOTAL, TICKETS } from '../src/data/tickets';
import { makeFounder } from './casinoLib';
import { startingLook } from '../src/data/avatar';
import type { DatabaseReader } from './_generated/server';

const LOCK_AFTER = 5;
const TENT_NAMES: string[] = TICKETS.filter(t => t.stay === 'sleepover').map(t => t.name);

// Tents booked: paid or waiting for the receipt check (rejected sign-ups free their tent)
async function tentsTaken(db: DatabaseReader) {
  const rows = await db.query('accounts').collect();
  return rows.filter(a => a.status !== 'rejected' && a.ticket && TENT_NAMES.includes(a.ticket)).length;
}

export const tents = query({
  args: {},
  handler: async ctx => {
    const taken = await tentsTaken(ctx.db);
    return { total: TENTS_TOTAL, left: Math.max(0, TENTS_TOTAL - taken) };
  },
});
const LOCK_MS = 10 * 60_000;

function hex(bytes: Uint8Array) {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
export function randomHex(n: number) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return hex(b);
}
export async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 100_000 }, key, 256);
  return hex(new Uint8Array(bits));
}
function same(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.min(a.length, b.length); i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
export function checkPassword(p: string) {
  if (p.length < 6 || p.length > 64) throw new ConvexError('Use a password of at least 6 characters.');
}

// ── Sign up and log in ────────────────────────────────────────────────

export const register = action({
  args: { name: v.string(), phone: v.string(), email: v.optional(v.string()), password: v.string(), ticket: v.optional(v.string()), guests: v.optional(v.number()), playerKey: v.string(), gender: v.optional(v.union(v.literal('male'), v.literal('female'))) },
  handler: async (ctx, args): Promise<{ playerKey: string; name: string }> => {
    const { password, ...rest } = args;
    checkPassword(password);
    const salt = randomHex(16);
    const passwordHash = await hashPassword(password, salt);
    return ctx.runMutation(internal.accounts.create, { ...rest, salt, passwordHash, spareKey: randomHex(16) });
  },
});

export const create = internalMutation({
  args: { name: v.string(), phone: v.string(), email: v.optional(v.string()), ticket: v.optional(v.string()), guests: v.optional(v.number()), playerKey: v.string(), salt: v.string(), passwordHash: v.string(), spareKey: v.string(), gender: v.optional(v.union(v.literal('male'), v.literal('female'))) },
  handler: async (ctx, args) => {
    const name = args.name.trim().replace(/\s+/g, ' ').slice(0, 40);
    if (name.length < 2) throw new ConvexError('Enter your name.');
    const phone = cleanPhone(args.phone);
    if (await ctx.db.query('accounts').withIndex('by_phone', q => q.eq('phone', phone)).unique()) {
      throw new ConvexError('That phone number already has an account. Log in instead.');
    }
    const email = args.email?.trim().toLowerCase() || undefined;
    if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120)) throw new ConvexError('Enter a valid email, or leave it empty.');
    // Registering is free. The ticket only says how they stay: Attendee is per person, a tent sleeps its people
    const ticket = TICKETS.find(t => t.id === args.ticket) ?? TICKETS[0];
    if (ticket.stay === 'sleepover' && await tentsTaken(ctx.db) >= TENTS_TOTAL) {
      throw new ConvexError('All the tents are taken. Pick an Attendee ticket instead.');
    }
    const count = Math.max(1, Math.min(20, Math.floor(args.guests ?? 1)));
    const guests = ticket.id === 'attendee' ? count : ticket.people;
    // Keep this phone's camp history (rooms, chess, Connect) unless that id already belongs to someone else
    const taken = args.playerKey.length >= 8 && await accountByKey(ctx.db, args.playerKey);
    const playerKey = args.playerKey.length >= 8 && !taken ? args.playerKey : args.spareKey;
    const id = await ctx.db.insert('accounts', {
      name, phone, email, stay: ticket.stay, guests, ticket: ticket.name, passwordHash: args.passwordHash, salt: args.salt,
      playerKey, status: 'approved', balance: 0, failedLogins: 0, lockedUntil: 0, createdAt: Date.now(),
      ...(args.gender ? { gender: args.gender, look: startingLook(args.gender, name + phone) } : {}),
    });
    await makeFounder(ctx.db, (await ctx.db.get(id))!);
    return { playerKey, name };
  },
});

export const forLogin = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => ctx.db.query('accounts').withIndex('by_phone', q => q.eq('phone', phone)).unique(),
});

export const loginResult = internalMutation({
  args: { id: v.id('accounts'), ok: v.boolean() },
  handler: async (ctx, { id, ok }) => {
    const a = await ctx.db.get(id);
    if (!a) return;
    if (ok) await ctx.db.patch(id, { failedLogins: 0, lockedUntil: 0 });
    else {
      const failed = a.failedLogins + 1;
      await ctx.db.patch(id, failed >= LOCK_AFTER ? { failedLogins: 0, lockedUntil: Date.now() + LOCK_MS } : { failedLogins: failed });
    }
  },
});

export const login = action({
  args: { phone: v.string(), password: v.string() },
  handler: async (ctx, args): Promise<{ playerKey: string; name: string }> => {
    const phone = cleanPhone(args.phone);
    const a: Doc<'accounts'> | null = await ctx.runQuery(internal.accounts.forLogin, { phone });
    const wrong = new ConvexError('Wrong phone number or password.');
    if (!a) { await hashPassword(args.password, 'no-account'); throw wrong; }
    if (a.lockedUntil > Date.now()) throw new ConvexError('Too many tries. Wait 10 minutes, or ask camp staff to reset your password.');
    const ok = same(await hashPassword(args.password, a.salt), a.passwordHash);
    await ctx.runMutation(internal.accounts.loginResult, { id: a._id, ok });
    if (!ok) throw wrong;
    return { playerKey: a.playerKey, name: a.name };
  },
});

export const changePassword = action({
  args: { playerKey: v.string(), oldPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    checkPassword(args.newPassword);
    const a: Doc<'accounts'> | null = await ctx.runQuery(internal.accounts.byKey, { playerKey: args.playerKey });
    if (!a) throw new ConvexError('Log in first.');
    if (!same(await hashPassword(args.oldPassword, a.salt), a.passwordHash)) throw new ConvexError('Your current password is wrong.');
    const salt = randomHex(16);
    await ctx.runMutation(internal.accounts.setPassword, { id: a._id, salt, passwordHash: await hashPassword(args.newPassword, salt) });
    return null;
  },
});

export const byKey = internalQuery({
  args: { playerKey: v.string() },
  handler: async (ctx, { playerKey }) => accountByKey(ctx.db, playerKey),
});

export const setPassword = internalMutation({
  args: { id: v.id('accounts'), salt: v.string(), passwordHash: v.string() },
  handler: async (ctx, { id, salt, passwordHash }) => { await ctx.db.patch(id, { salt, passwordHash, failedLogins: 0, lockedUntil: 0 }); },
});

// ── The camper's own page ─────────────────────────────────────────────

export const me = query({
  args: { playerKey: v.string() },
  handler: async (ctx, { playerKey }) => {
    const bankInfo = await bank(ctx.db);
    const a = await accountByKey(ctx.db, playerKey);
    if (!a) return { account: null, bank: bankInfo };
    const [payments, entries, orders, prices, items] = await Promise.all([
      ctx.db.query('payments').withIndex('by_account', q => q.eq('accountId', a._id)).order('desc').take(10),
      ctx.db.query('walletEntries').withIndex('by_account', q => q.eq('accountId', a._id)).order('desc').take(20),
      ctx.db.query('shopOrders').withIndex('by_account', q => q.eq('accountId', a._id)).order('desc').take(10),
      ctx.db.query('gamePrices').collect(),
      ctx.db.query('shopItems').collect(),
    ]);
    return {
      bank: bankInfo,
      staff: await staffRole(ctx.db, playerKey),
      account: { name: a.name, phone: a.phone, status: a.status, balance: a.balance, ticket: a.ticket ?? null, ticketTotal: a.ticketTotal ?? null, guests: a.guests ?? 1, gender: a.gender ?? null, look: a.look ?? null, shout: a.shout ?? '' },
      payments: payments.map(p => ({ id: p._id, kind: p.kind, amount: p.amount, status: p.status, note: p.note ?? null, createdAt: p.createdAt })),
      entries: entries.map(e => ({ id: e._id, amount: e.amount, label: e.label, createdAt: e.createdAt })),
      orders: orders.map(o => ({ id: o._id, item: o.item, emoji: o.emoji, price: o.price, status: o.status, createdAt: o.createdAt })),
      prices: Object.fromEntries(prices.filter(p => p.price > 0).map(p => [p.game, p.price])),
      shop: items.filter(i => i.active).map(i => ({ id: i._id, name: i.name, emoji: i.emoji, price: i.price })),
    };
  },
});

export const proofUploadUrl = mutation({
  args: { playerKey: v.string() },
  handler: async (ctx, { playerKey }) => {
    await requireAccount(ctx.db, playerKey, false);
    return ctx.storage.generateUploadUrl();
  },
});

export const submitPayment = mutation({
  args: { playerKey: v.string(), kind: v.union(v.literal('registration'), v.literal('topup')), amount: v.number(), proof: v.id('_storage') },
  handler: async (ctx, args) => {
    const a = await requireAccount(ctx.db, args.playerKey, args.kind === 'topup');
    const amount = cleanAmount(args.amount);
    const meta = await ctx.db.system.get(args.proof);
    if (!meta || !['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'].includes(meta.contentType ?? '') || meta.size > 8 * 1024 * 1024) {
      throw new ConvexError('Upload a photo or PDF of the receipt, up to 8 MB.');
    }
    if (await ctx.db.query('payments').withIndex('by_proof', q => q.eq('proof', args.proof)).first()) throw new ConvexError('That receipt was already sent.');
    const mine = await ctx.db.query('payments').withIndex('by_account', q => q.eq('accountId', a._id)).collect();
    if (mine.filter(p => p.status === 'pending').length >= 3) throw new ConvexError('You already have 3 receipts waiting. Wait for camp staff to check them.');
    if (args.kind === 'registration' && (a.status === 'approved' || mine.some(p => p.kind === 'registration' && p.status === 'pending'))) {
      throw new ConvexError(a.status === 'approved' ? 'Your camp fee is already approved.' : 'Your camp fee receipt is already waiting to be checked.');
    }
    await ctx.db.insert('payments', { accountId: a._id, kind: args.kind, amount, proof: args.proof, status: 'pending', createdAt: Date.now() });
    return null;
  },
});

// Solo games with an entry fee: pay once, play until you leave the game
export const payToPlay = mutation({
  args: { playerKey: v.string(), game: v.string() },
  handler: async (ctx, { playerKey, game }) => {
    const a = await requireAccount(ctx.db, playerKey);
    const price = (await ctx.db.query('gamePrices').withIndex('by_game', q => q.eq('game', game)).unique())?.price ?? 0;
    if (price <= 0) return { balance: a.balance };
    return { balance: await charge(ctx.db, a, price, 'play', `Played ${game}`) };
  },
});

export const buy = mutation({
  args: { playerKey: v.string(), itemId: v.id('shopItems') },
  handler: async (ctx, { playerKey, itemId }) => {
    const a = await requireAccount(ctx.db, playerKey);
    const item = await ctx.db.get(itemId);
    if (!item || !item.active) throw new ConvexError('That item is not on sale right now.');
    const balance = await charge(ctx.db, a, item.price, 'shop', `Bought ${item.name}`);
    await ctx.db.insert('shopOrders', { accountId: a._id, item: item.name, emoji: item.emoji, price: item.price, status: 'paid', createdAt: Date.now() });
    return { balance };
  },
});

export const priceFor = query({
  args: { game: v.string() },
  handler: async (ctx, { game }) => (await ctx.db.query('gamePrices').withIndex('by_game', q => q.eq('game', game)).unique())?.price ?? 0,
});
