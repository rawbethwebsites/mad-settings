// The Casino: buy chips with the wallet, the chip leaderboard, Founding Campers, and staff controls.
import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { DatabaseReader } from './_generated/server';
import { accountByKey, charge, requireAccount, requireStaff, staffRole } from './walletLib';
import { casino, DAILY_BUY_LIMIT, FOUNDER_CHIPS, FOUNDERS, moveChips, PACKS, STAKES } from './casinoLib';

const DAY_MS = 24 * 60 * 60 * 1000;

async function foundersTaken(db: DatabaseReader) {
  const last = await db.query('accounts').withIndex('by_founder', q => q.gt('founderNo', 0)).order('desc').first();
  return last?.founderNo ?? 0;
}

// Naira spent on chips in the last 24 hours
async function boughtToday(db: DatabaseReader, accountId: import('./_generated/dataModel').Id<'accounts'>) {
  const rows = await db.query('walletEntries')
    .withIndex('by_account', q => q.eq('accountId', accountId).gt('createdAt', Date.now() - DAY_MS)).collect();
  return rows.filter(r => r.kind === 'chips').reduce((sum, r) => sum - r.amount, 0);
}

const firstName = (name: string) => name.split(' ')[0];

export const lobby = query({
  args: { playerKey: v.string() },
  handler: async (ctx, { playerKey }) => {
    const settings = await casino(ctx.db);
    const top = await ctx.db.query('accounts').withIndex('by_chips', q => q.gt('chips', 0)).order('desc').take(10);
    const a = await accountByKey(ctx.db, playerKey);
    return {
      ...settings,
      packs: PACKS,
      stakes: STAKES,
      dailyLimit: DAILY_BUY_LIMIT,
      foundersLeft: Math.max(0, FOUNDERS - await foundersTaken(ctx.db)),
      founderChips: FOUNDER_CHIPS,
      staff: await staffRole(ctx.db, playerKey),
      leaderboard: top.map(t => ({ name: firstName(t.name), chips: t.chips ?? 0, founderNo: t.founderNo ?? null, me: t._id === a?._id })),
      me: a && {
        name: a.name,
        status: a.status,
        balance: a.balance,
        chips: a.chips ?? 0,
        adult: !!a.adult,
        founderNo: a.founderNo ?? null,
        boughtToday: await boughtToday(ctx.db, a._id),
        history: (await ctx.db.query('chipEntries').withIndex('by_account', q => q.eq('accountId', a._id)).order('desc').take(15))
          .map(e => ({ id: e._id, amount: e.amount, label: e.label, createdAt: e.createdAt })),
      },
    };
  },
});

export const confirmAdult = mutation({
  args: { playerKey: v.string() },
  handler: async (ctx, { playerKey }) => {
    const a = await requireAccount(ctx.db, playerKey);
    await ctx.db.patch(a._id, { adult: true });
    return null;
  },
});

export const buyChips = mutation({
  args: { playerKey: v.string(), naira: v.number() },
  handler: async (ctx, { playerKey, naira }) => {
    const pack = PACKS.find(p => p.naira === naira);
    if (!pack) throw new ConvexError('Pick one of the chip packs.');
    const a = await requireAccount(ctx.db, playerKey);
    if (!a.adult) throw new ConvexError('Confirm you are 18 or older first.');
    if ((await casino(ctx.db)).paused) throw new ConvexError('The Casino is paused by camp staff right now.');
    const spent = await boughtToday(ctx.db, a._id);
    if (spent + pack.naira > DAILY_BUY_LIMIT) {
      throw new ConvexError(`That goes over the ₦${DAILY_BUY_LIMIT.toLocaleString()} daily chip limit. You can buy ₦${Math.max(0, DAILY_BUY_LIMIT - spent).toLocaleString()} more today.`);
    }
    await charge(ctx.db, a, pack.naira, 'chips', `${pack.chips.toLocaleString()} casino chips`);
    const fresh = (await ctx.db.get(a._id))!;
    return { chips: await moveChips(ctx.db, fresh, pack.chips, 'buy', `Bought with ₦${pack.naira.toLocaleString()}`) };
  },
});

// Head Ranger only: the house cut and the pause switch
export const setCasino = mutation({
  args: { playerId: v.string(), houseCut: v.optional(v.number()), paused: v.optional(v.boolean()) },
  handler: async (ctx, { playerId, houseCut, paused }) => {
    await requireStaff(ctx.db, playerId, true);
    if (houseCut !== undefined && (!Number.isInteger(houseCut) || houseCut < 0 || houseCut > 20)) {
      throw new ConvexError('Set the house cut between 0% and 20%.');
    }
    const now = await casino(ctx.db);
    const fields = { houseCut: houseCut ?? now.houseCut, paused: paused ?? now.paused };
    const row = await ctx.db.query('casinoSettings').withIndex('by_key', q => q.eq('key', 'casino')).unique();
    if (row) await ctx.db.patch(row._id, fields);
    else await ctx.db.insert('casinoSettings', { key: 'casino', ...fields });
    return null;
  },
});

// Staff view: chips sold, chips in play, what the house kept
export const report = query({
  args: { playerId: v.string() },
  handler: async (ctx, { playerId }) => {
    if (!(await staffRole(ctx.db, playerId))) return null;
    const since = Date.now() - 30 * DAY_MS;
    const sold = await ctx.db.query('walletEntries').filter(q => q.and(q.eq(q.field('kind'), 'chips'), q.gt(q.field('createdAt'), since))).collect();
    const matches = await ctx.db.query('matches').filter(q => q.and(q.neq(q.field('payout'), undefined), q.gt(q.field('updatedAt'), since))).collect();
    const holders = await ctx.db.query('accounts').withIndex('by_chips', q => q.gt('chips', 0)).collect();
    return {
      ...(await casino(ctx.db)),
      nairaSold: sold.reduce((s, r) => s - r.amount, 0),
      chipGames: matches.length,
      houseKept: matches.reduce((s, m) => s + (m.payout?.house ?? 0), 0),
      chipsHeld: holders.reduce((s, a) => s + (a.chips ?? 0), 0),
      founders: await foundersTaken(ctx.db),
    };
  },
});
