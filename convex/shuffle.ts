import { mutation, query } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { v, ConvexError } from 'convex/values';
import { RULES } from '../src/lib/rules';
import { shuffle as mix } from '../src/lib/rules/types';
import { memberOf, requireMember } from './roomLib';
import { accountByKey, chargeEntry, priceOf } from './walletLib';
import { start } from './matches';

// Play random campers, battle-royale style. Campers on the shuffle screen ping every few seconds;
// each ping (and each join) tries to deal games from whoever is waiting. Convex runs every mutation
// as one transaction, so two pings can never seat the same camper twice.
const STALE_MS = 20 * 1000; // no ping for this long = gone, dropped from the queue
const GATHER_MS = 8 * 1000; // wait this long for a fuller table before dealing a smaller one
const NEW_FACE_MS = 20 * 1000; // the same campers again only if nobody new turns up by then

type Row = Doc<'shuffleQueue'>;

function rulesFor(game: string) {
  const rules = RULES[game];
  if (!rules) throw new ConvexError("That game can't be played online.");
  return rules;
}

const mine = (ctx: { db: MutationCtx['db'] }, playerId: string) =>
  ctx.db.query('shuffleQueue').withIndex('by_player', q => q.eq('playerId', playerId)).first();

// Can this camper still sit down: in the room, and able to pay the entry fee
async function canPlay(ctx: MutationCtx, row: Row, price: number) {
  const me = await memberOf(ctx.db, row.roomId, row.playerId);
  if (!me || me.kicked) return null;
  if (price > 0) {
    const account = await accountByKey(ctx.db, row.playerId);
    if (!account || account.status !== 'approved' || account.balance < price) return null;
  }
  return me;
}

async function deal(ctx: MutationCtx, roomId: Id<'rooms'>, game: string, group: { row: Row; me: Doc<'roomPlayers'> }[]) {
  const seats = mix(group).map(({ me }) => ({ playerId: me.playerId, name: me.name, avatar: me.avatar }));
  const paid = [];
  for (const s of seats) paid.push(...await chargeEntry(ctx.db, s.playerId, game, `${game} random campers`));
  const now = Date.now();
  const id = await ctx.db.insert('matches', {
    roomId, game, seats, paid, shuffle: true,
    creatorId: seats[0].playerId,
    invited: seats.slice(1).map(s => s.playerId),
    status: 'waiting', round: 1, createdAt: now, updatedAt: now,
  });
  await ctx.db.patch(id, await start(ctx, (await ctx.db.get(id))!));
  for (const { row } of group) {
    await ctx.db.patch(row._id, {
      status: 'matched', matchId: id, round: row.round + 1,
      lastWith: seats.map(s => s.playerId).filter(p => p !== row.playerId),
    });
  }
}

// Deal as many games as the waiting campers make
async function pairUp(ctx: MutationCtx, roomId: Id<'rooms'>, game: string) {
  const rules = RULES[game];
  if (!rules) return;
  const now = Date.now();
  const price = await priceOf(ctx.db, game);
  const rows = await ctx.db
    .query('shuffleQueue')
    .withIndex('by_room_game', q => q.eq('roomId', roomId).eq('game', game).eq('status', 'waiting'))
    .take(200);
  const live: { row: Row; me: Doc<'roomPlayers'> }[] = [];
  for (const row of rows.sort((a, b) => a.joinedAt - b.joinedAt)) {
    const me = row.lastSeen > now - STALE_MS ? await canPlay(ctx, row, price) : null;
    if (me) live.push({ row, me });
    else await ctx.db.delete(row._id);
  }
  while (live.length >= rules.min) {
    const group = live.slice(0, rules.max);
    if (group.length < rules.max && now - group[0].row.joinedAt < GATHER_MS) return;
    // Only each other again? Give someone new a moment to turn up first
    const same = group.every(({ row }) => group.every(o => o.row === row || row.lastWith.includes(o.row.playerId)));
    if (same && now - group[group.length - 1].row.joinedAt < NEW_FACE_MS) return;
    live.splice(0, group.length);
    await deal(ctx, roomId, game, group);
  }
}

// Tap "Play random campers": into the queue for this game
export const join = mutation({
  args: { code: v.string(), playerId: v.string(), game: v.string() },
  handler: async (ctx, args) => {
    rulesFor(args.game);
    const { room, me } = await requireMember(ctx.db, args.code, args.playerId);
    const price = await priceOf(ctx.db, args.game);
    if (price > 0) {
      const account = await accountByKey(ctx.db, args.playerId);
      if (!account || account.balance < price) throw new ConvexError(`This game costs ₦${price.toLocaleString()} a round. Top up your wallet first.`);
    }
    const row = await mine(ctx, args.playerId);
    if (row?.status === 'matched' && row.matchId && (await ctx.db.get(row.matchId))?.status === 'playing') return null;
    const now = Date.now();
    const fresh = { roomId: room._id, game: args.game, name: me.name, avatar: me.avatar, status: 'waiting' as const, joinedAt: now, lastSeen: now };
    if (!row) await ctx.db.insert('shuffleQueue', { ...fresh, playerId: args.playerId, lastWith: [], round: 0, wins: 0 });
    else if (row.roomId === room._id && row.game === args.game) await ctx.db.patch(row._id, fresh);
    else await ctx.db.patch(row._id, { ...fresh, lastWith: [], round: 0, wins: 0, matchId: undefined });
    await pairUp(ctx, room._id, args.game);
    return null;
  },
});

// "Still here": keeps you in the queue and deals any games that are ready
export const ping = mutation({
  args: { playerId: v.string() },
  handler: async (ctx, args) => {
    const row = await mine(ctx, args.playerId);
    if (!row) return null;
    await ctx.db.patch(row._id, { lastSeen: Date.now() });
    // A game that ended without the shuffle hearing about it: back in the queue
    if (row.status === 'matched') {
      const match = row.matchId && await ctx.db.get(row.matchId);
      if (!match || (match.status !== 'playing' && match.status !== 'finished')) {
        await ctx.db.patch(row._id, { status: 'waiting', joinedAt: Date.now() });
      } else return null;
    }
    if (row.status !== 'won') await pairUp(ctx, row.roomId, row.game);
    return null;
  },
});

export const leave = mutation({
  args: { playerId: v.string() },
  handler: async (ctx, args) => {
    const row = await mine(ctx, args.playerId);
    if (row) await ctx.db.delete(row._id);
    return null;
  },
});

// My place in the shuffle. Names and avatars only, never other campers' ids.
export const status = query({
  args: { playerId: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.query('shuffleQueue').withIndex('by_player', q => q.eq('playerId', args.playerId)).first();
    if (!row) return null;
    const cutoff = Date.now() - STALE_MS;
    const waiting = (await ctx.db
      .query('shuffleQueue')
      .withIndex('by_room_game', q => q.eq('roomId', row.roomId).eq('game', row.game).eq('status', 'waiting'))
      .take(50))
      .filter(r => r.lastSeen > cutoff && r.playerId !== args.playerId)
      .map(r => ({ name: r.name, avatar: r.avatar }));
    const match = row.matchId ? await ctx.db.get(row.matchId) : null;
    return {
      game: row.game,
      status: row.status,
      round: row.round,
      wins: row.wins,
      matchId: row.matchId ?? null,
      matchLive: match?.status === 'playing',
      opponents: (match?.seats ?? []).filter(s => s.playerId !== args.playerId).map(s => ({ name: s.name, avatar: s.avatar })),
      waiting,
    };
  },
});
