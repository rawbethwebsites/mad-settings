// The camp admin panel: check bank-transfer receipts, run wallets, set prices, the shop and bank details.
// Open to admins (Head Rangers) and to Cashiers. Admins can appoint other admins and Cashiers.
import { ConvexError, v } from 'convex/values';
import { action, internalMutation, internalQuery, mutation, query } from './_generated/server';
import type { DatabaseReader } from './_generated/server';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { checkPassword, hashPassword, randomHex } from './accounts';
import { bank, cleanAmount, credit, requireStaff, staffRole } from './walletLib';
import { makeFounder } from './casinoLib';
import { addToCamp } from './roomLib';
import { TENTS_TOTAL } from '../src/data/tickets';

const staffArg = { playerId: v.string() };

export const overview = query({
  args: staffArg,
  handler: async (ctx, { playerId }) => {
    const role = await staffRole(ctx.db, playerId);
    if (!role) return null;
    const pending = await ctx.db.query('payments').withIndex('by_status', q => q.eq('status', 'pending')).order('asc').take(50);
    const recent = await ctx.db.query('payments').withIndex('by_status', q => q.eq('status', 'approved')).order('desc').take(10);
    const orders = await ctx.db.query('shopOrders').withIndex('by_status', q => q.eq('status', 'paid')).order('asc').take(50);
    const withAccount = async <T extends { accountId: Id<'accounts'> }>(rows: T[]) =>
      Promise.all(rows.map(async r => {
        const a = await ctx.db.get(r.accountId);
        return { row: r, camper: a ? { id: a._id, name: a.name, phone: a.phone, status: a.status, balance: a.balance, ticket: a.ticket ?? null, ticketTotal: a.ticketTotal ?? null } : null };
      }));
    const staff = await ctx.db.query('staff').collect();
    const heads = (await ctx.db.query('rangers').collect()).filter(r => r.role === 'headRanger');
    return {
      role,
      bank: await bank(ctx.db),
      pending: await Promise.all((await withAccount(pending)).map(async ({ row, camper }) => ({
        id: row._id, kind: row.kind, amount: row.amount, createdAt: row.createdAt, camper, proofUrl: await ctx.storage.getUrl(row.proof),
      }))),
      recent: (await withAccount(recent)).map(({ row, camper }) => ({ id: row._id, kind: row.kind, amount: row.amount, reviewer: row.reviewer ?? '', at: row.reviewedAt ?? row.createdAt, camper })),
      orders: (await withAccount(orders)).map(({ row, camper }) => ({ id: row._id, item: row.item, emoji: row.emoji, price: row.price, createdAt: row.createdAt, camper })),
      prices: (await ctx.db.query('gamePrices').collect()).map(p => ({ game: p.game, price: p.price })),
      shop: (await ctx.db.query('shopItems').collect()).map(i => ({ id: i._id, name: i.name, emoji: i.emoji, price: i.price, active: i.active })),
      cashiers: await Promise.all(staff.map(async s => {
        const a = await ctx.db.query('accounts').withIndex('by_player_key', q => q.eq('playerKey', s.playerId)).unique();
        return { accountId: a?._id ?? null, name: a?.name ?? 'Unknown camper', phone: a?.phone ?? '' };
      })),
      admins: await Promise.all(heads.map(async r => {
        const a = await ctx.db.query('accounts').withIndex('by_player_key', q => q.eq('playerKey', r.playerId)).unique();
        return { accountId: a?._id ?? null, name: a?.name ?? 'Unknown camper', phone: a?.phone ?? '', you: r.playerId === playerId };
      })),
    };
  },
});

// The live dashboard: who's coming, how they're staying, and what's moving right now
const DAY = 86_400_000;
const LAGOS = 3_600_000; // WAT is UTC+1, no daylight saving
const lagosDay = (t: number) => Math.floor((t + LAGOS) / DAY);

export const stats = query({
  args: staffArg,
  handler: async (ctx, { playerId }) => {
    if (!(await staffRole(ctx.db, playerId))) return null;
    const now = Date.now();
    const accounts = await ctx.db.query('accounts').collect();
    const live = accounts.filter(a => a.status !== 'rejected');
    const today = lagosDay(now);
    const days = Array.from({ length: 14 }, (_, i) => today - 13 + i);
    const perDay = new Map(days.map(d => [d, 0]));
    for (const a of live) { const d = lagosDay(a.createdAt); if (perDay.has(d)) perDay.set(d, perDay.get(d)! + 1); }
    const byTicket = (name: string) => live.filter(a => a.ticket === name);
    const tentsTaken = byTicket('Single tent').length + byTicket('Couples tent').length;
    const topups = await ctx.db.query('payments').withIndex('by_status', q => q.eq('status', 'approved')).collect();
    const pending = await ctx.db.query('payments').withIndex('by_status', q => q.eq('status', 'pending')).collect();
    const orders = await ctx.db.query('shopOrders').withIndex('by_status', q => q.eq('status', 'paid')).collect();
    const profiles = await ctx.db.query('connectProfiles').collect();
    const matches = await ctx.db.query('connectMatches').collect();
    return {
      now,
      campers: live.length,
      people: live.reduce((n, a) => n + (a.guests ?? 1), 0),
      today: perDay.get(today) ?? 0,
      lastHour: live.filter(a => now - a.createdAt < 3_600_000).length,
      onHold: accounts.length - live.length,
      tents: { taken: tentsTaken, total: TENTS_TOTAL },
      stay: [
        { label: 'Attendee', campers: byTicket('Attendee').length, people: byTicket('Attendee').reduce((n, a) => n + (a.guests ?? 1), 0) },
        { label: 'Single tent', campers: byTicket('Single tent').length, people: byTicket('Single tent').length },
        { label: 'Couples tent', campers: byTicket('Couples tent').length, people: byTicket('Couples tent').length * 2 },
      ],
      gender: { female: live.filter(a => a.gender === 'female').length, male: live.filter(a => a.gender === 'male').length, unset: live.filter(a => !a.gender).length },
      founders: live.filter(a => a.founderNo).length,
      perDay: days.map(d => ({ day: d * DAY, count: perDay.get(d)! })),
      newest: [...live].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8).map(a => ({ id: a._id, name: a.name, ticket: a.ticket ?? 'Attendee', guests: a.guests ?? 1, at: a.createdAt })),
      money: {
        wallets: live.reduce((n, a) => n + a.balance, 0),
        toppedUp: topups.filter(p => p.kind === 'topup').reduce((n, p) => n + p.amount, 0),
        chips: live.reduce((n, a) => n + (a.chips ?? 0), 0),
      },
      waiting: { receipts: pending.length, orders: orders.length },
      connect: { profiles: profiles.filter(p => !p.banned).length, matches: matches.filter(m => m.active).length, messages: matches.reduce((n, m) => n + m.messageCount, 0) },
    };
  },
});

// Cashiers can't approve their own receipts or change their own wallet; another staff member must
function notOwn(role: 'head' | 'cashier', accountKey: string, playerId: string) {
  if (role !== 'head' && accountKey === playerId) throw new ConvexError('Ask another staff member to handle your own account.');
}

async function reviewerName(ctx: { db: DatabaseReader }, playerId: string) {
  const a = await ctx.db.query('accounts').withIndex('by_player_key', q => q.eq('playerKey', playerId)).unique();
  return a?.name ?? 'Head Ranger';
}

export const review = mutation({
  args: { ...staffArg, paymentId: v.id('payments'), approve: v.boolean(), amount: v.optional(v.number()), note: v.optional(v.string()) },
  handler: async (ctx, { playerId, paymentId, approve, amount, note }) => {
    const role = await requireStaff(ctx.db, playerId);
    const p = await ctx.db.get(paymentId);
    if (!p || p.status !== 'pending') throw new ConvexError('Someone already checked that receipt.');
    const a = await ctx.db.get(p.accountId);
    if (!a) throw new ConvexError('That camper account is gone.');
    notOwn(role, a.playerKey, playerId);
    const reviewer = await reviewerName(ctx, playerId);
    // Staff can correct the amount to what actually landed in the bank
    const landed = amount === undefined ? p.amount : cleanAmount(amount);
    await ctx.db.patch(p._id, { status: approve ? 'approved' : 'rejected', amount: landed, reviewer, reviewedAt: Date.now(), note: note?.trim().slice(0, 200) || undefined });
    if (!approve) return null;
    if (p.kind === 'registration') {
      await ctx.db.patch(a._id, { status: 'approved' });
      await makeFounder(ctx.db, a);
    }
    else await credit(ctx.db, a, landed, 'topup', 'Wallet top-up (bank transfer)', reviewer);
    return null;
  },
});

export const findCampers = query({
  args: { ...staffArg, q: v.string() },
  handler: async (ctx, { playerId, q }) => {
    if (!(await staffRole(ctx.db, playerId))) return [];
    const term = q.trim().toLowerCase();
    const digits = term.replace(/\D/g, '');
    const rows = await ctx.db.query('accounts').withIndex('by_created').order('desc').take(1000);
    const hits = term
      ? rows.filter(a => a.name.toLowerCase().includes(term) || (digits.length >= 3 && a.phone.includes(digits)))
      : rows;
    return Promise.all(hits.slice(0, 30).map(async a => ({
      id: a._id, name: a.name, phone: a.phone, status: a.status, balance: a.balance,
      cashier: !!(await ctx.db.query('staff').withIndex('by_player', s => s.eq('playerId', a.playerKey)).unique()),
      admin: (await staffRole(ctx.db, a.playerKey)) === 'head',
    })));
  },
});

export const adjust = mutation({
  args: { ...staffArg, accountId: v.id('accounts'), amount: v.number(), reason: v.string() },
  handler: async (ctx, { playerId, accountId, amount, reason }) => {
    const role = await requireStaff(ctx.db, playerId);
    if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 5_000_000) throw new ConvexError('Enter a whole naira amount, like 500 or -500.');
    const why = reason.trim().slice(0, 120);
    if (why.length < 3) throw new ConvexError('Say why, so the record makes sense later.');
    const a = await ctx.db.get(accountId);
    if (!a) throw new ConvexError('That camper account is gone.');
    notOwn(role, a.playerKey, playerId);
    return credit(ctx.db, a, amount, 'adjust', why, await reviewerName(ctx, playerId));
  },
});

export const setAccountStatus = mutation({
  args: { ...staffArg, accountId: v.id('accounts'), status: v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected')) },
  handler: async (ctx, { playerId, accountId, status }) => {
    const role = await requireStaff(ctx.db, playerId);
    const a = await ctx.db.get(accountId);
    if (!a) throw new ConvexError('That camper account is gone.');
    notOwn(role, a.playerKey, playerId);
    await ctx.db.patch(accountId, { status });
    return null;
  },
});

export const resetPassword = action({
  args: { ...staffArg, accountId: v.id('accounts') },
  handler: async (ctx, { playerId, accountId }): Promise<string> => {
    await ctx.runQuery(internal.walletAdmin.checkStaff, { playerId });
    const temp = randomHex(3).toUpperCase();
    checkPassword(temp);
    const salt = randomHex(16);
    await ctx.runMutation(internal.accounts.setPassword, { id: accountId, salt, passwordHash: await hashPassword(temp, salt) });
    return temp;
  },
});

export const checkStaff = internalQuery({
  args: staffArg,
  handler: async (ctx, { playerId }) => { await requireStaff(ctx.db, playerId); return null; },
});

export const setPrice = mutation({
  args: { ...staffArg, game: v.string(), price: v.number() },
  handler: async (ctx, { playerId, game, price }) => {
    await requireStaff(ctx.db, playerId);
    if (!/^[a-z0-9]{2,20}$/.test(game)) throw new ConvexError('Unknown game.');
    if (!Number.isInteger(price) || price < 0 || price > 100_000) throw new ConvexError('Enter a price in naira (0 means free).');
    const row = await ctx.db.query('gamePrices').withIndex('by_game', q => q.eq('game', game)).unique();
    if (row) await ctx.db.patch(row._id, { price });
    else await ctx.db.insert('gamePrices', { game, price });
    return null;
  },
});

export const saveShopItem = mutation({
  args: { ...staffArg, id: v.optional(v.id('shopItems')), name: v.string(), emoji: v.string(), price: v.number(), active: v.boolean() },
  handler: async (ctx, { playerId, id, name, emoji, price, active }) => {
    await requireStaff(ctx.db, playerId);
    const clean = name.trim().slice(0, 40);
    if (clean.length < 2) throw new ConvexError('Give the item a name.');
    if (!Number.isInteger(price) || price < 1 || price > 1_000_000) throw new ConvexError('Enter a price in naira.');
    const fields = { name: clean, emoji: [...emoji.trim()].slice(0, 2).join('') || '🛍️', price, active };
    if (id) await ctx.db.patch(id, fields);
    else await ctx.db.insert('shopItems', { ...fields, createdAt: Date.now() });
    return null;
  },
});

export const orderDone = mutation({
  args: { ...staffArg, orderId: v.id('shopOrders'), refund: v.boolean() },
  handler: async (ctx, { playerId, orderId, refund }) => {
    await requireStaff(ctx.db, playerId);
    const o = await ctx.db.get(orderId);
    if (!o || o.status !== 'paid') throw new ConvexError('That order was already handled.');
    await ctx.db.patch(o._id, { status: refund ? 'refunded' : 'collected' });
    if (refund) {
      const a = await ctx.db.get(o.accountId);
      if (a) await credit(ctx.db, a, o.price, 'refund', `Refund: ${o.item}`, await reviewerName(ctx, playerId));
    }
    return null;
  },
});

export const saveBank = mutation({
  args: { ...staffArg, bankName: v.string(), accountName: v.string(), accountNumber: v.string(), priceNote: v.string() },
  handler: async (ctx, args) => {
    await requireStaff(ctx.db, args.playerId, true);
    const fields = {
      bankName: args.bankName.trim().slice(0, 60), accountName: args.accountName.trim().slice(0, 80),
      accountNumber: args.accountNumber.replace(/\D/g, '').slice(0, 10), priceNote: args.priceNote.trim().slice(0, 300),
    };
    if (fields.accountNumber.length !== 10 || !fields.bankName || !fields.accountName) throw new ConvexError('Enter the bank, account name and the 10-digit account number.');
    const row = await ctx.db.query('campSettings').withIndex('by_key', q => q.eq('key', 'bank')).unique();
    if (row) await ctx.db.patch(row._id, fields);
    else await ctx.db.insert('campSettings', { key: 'bank', ...fields });
    return null;
  },
});

export const setCashier = mutation({
  args: { ...staffArg, accountId: v.id('accounts'), on: v.boolean() },
  handler: async (ctx, { playerId, accountId, on }) => {
    await requireStaff(ctx.db, playerId, true);
    const a = await ctx.db.get(accountId);
    if (!a) throw new ConvexError('That camper account is gone.');
    const row = await ctx.db.query('staff').withIndex('by_player', q => q.eq('playerId', a.playerKey)).unique();
    if (on && !row) await ctx.db.insert('staff', { playerId: a.playerKey, role: 'cashier', createdAt: Date.now() });
    if (!on && row) await ctx.db.delete(row._id);
    return null;
  },
});

// Admins appoint other admins (Head Rangers). You can't remove yourself, so the camp always keeps one.
export const setAdmin = mutation({
  args: { ...staffArg, accountId: v.id('accounts'), on: v.boolean() },
  handler: async (ctx, { playerId, accountId, on }) => {
    await requireStaff(ctx.db, playerId, true);
    const a = await ctx.db.get(accountId);
    if (!a) throw new ConvexError('That camper account is gone.');
    if (!on && a.playerKey === playerId) throw new ConvexError('You can\'t remove yourself. Ask another admin.');
    const row = await ctx.db.query('rangers').withIndex('by_player', q => q.eq('playerId', a.playerKey)).unique();
    if (on) {
      if (row) await ctx.db.patch(row._id, { role: 'headRanger' });
      else await ctx.db.insert('rangers', { playerId: a.playerKey, role: 'headRanger', createdAt: Date.now() });
      if (a.status !== 'approved') await ctx.db.patch(a._id, { status: 'approved' });
    } else if (row?.role === 'headRanger') await ctx.db.delete(row._id);
    await addToCamp(ctx.db, (await ctx.db.get(a._id))!);
    return null;
  },
});

// CLI only (npx convex run): make a camper account a Head Ranger, alongside any existing one
export const makeHeadRanger = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const target = email.trim().toLowerCase();
    const matches = (await ctx.db.query('accounts').collect()).filter(a => a.email === target);
    if (matches.length !== 1) throw new ConvexError(`Expected one account with that email, found ${matches.length}.`);
    const a = matches[0];
    const existing = await ctx.db.query('rangers').withIndex('by_player', q => q.eq('playerId', a.playerKey)).unique();
    if (existing) await ctx.db.patch(existing._id, { role: 'headRanger' });
    else await ctx.db.insert('rangers', { playerId: a.playerKey, role: 'headRanger', createdAt: Date.now() });
    return { name: a.name, status: a.status };
  },
});

// CLI only (npx convex run walletAdmin:approveWaiting): registering went free on 28 Oct 2026,
// so everyone still waiting on a camp-fee receipt check gets in
export const approveWaiting = internalMutation({
  args: {},
  handler: async ctx => {
    const waiting = (await ctx.db.query('accounts').collect()).filter(a => a.status === 'pending');
    for (const a of waiting) {
      await ctx.db.patch(a._id, { status: 'approved' });
      await makeFounder(ctx.db, a);
      await addToCamp(ctx.db, a);
    }
    return { approved: waiting.length };
  },
});
