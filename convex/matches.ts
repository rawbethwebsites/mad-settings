import { internalMutation, mutation, query } from "./_generated/server";
import type { DatabaseReader, DatabaseWriter, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import { RULES } from "../src/lib/rules";
import { addPoints, isOnline, memberOf, requireMember } from "./roomLib";
import { chargeEntry, refundEntries } from "./walletLib";
import { casino, payPot, refundStakes, STAKES, takeStake } from "./casinoLib";
import { shuffleEnded } from "./shuffleLib";

const INVITE_MS = 15 * 60 * 1000;

function rulesFor(game: string) {
  const rules = RULES[game];
  if (!rules) throw new ConvexError("That game can't be played online.");
  return rules;
}

function seatOf(match: Doc<"matches">, playerId: string) {
  const i = match.seats.findIndex((s) => s.playerId === playerId);
  return i < 0 ? null : i;
}

async function turnTimer(
  ctx: MutationCtx,
  match: Doc<"matches">,
  state: Doc<"matches">["state"],
): Promise<{ moveNo: number; turnDeadline: number | undefined }> {
  const rules = rulesFor(match.game);
  if (!rules.turnSeconds || rules.turn(state) === null) {
    return { moveNo: match.moveNo ?? 0, turnDeadline: undefined };
  }
  const moveNo = (match.moveNo ?? 0) + 1;
  const ms = rules.turnSeconds * 1000;
  const turnDeadline = Date.now() + ms;
  await ctx.scheduler.runAfter(ms + 500, internal.matches.expire, { matchId: match._id, moveNo });
  return { moveNo, turnDeadline };
}

export async function start(ctx: MutationCtx, match: Doc<"matches">) {
  const rules = rulesFor(match.game);
  const state = rules.init(match.seats.map((s) => s.name));
  return {
    status: "playing" as const,
    state,
    ...await turnTimer(ctx, match, state),
    result: undefined,
    updatedAt: Date.now(),
  };
}

// Game never started: entry fees and chip stakes go back
async function callOff(db: DatabaseWriter, match: Doc<"matches">) {
  await refundEntries(db, match);
  await refundStakes(db, match);
}

async function load(db: DatabaseReader, matchId: Id<"matches">) {
  const match = await db.get(matchId);
  if (!match) throw new ConvexError("That game is gone.");
  return match;
}

// Someone leaves or times out: the others win and get the points
async function forfeit(db: DatabaseWriter, match: Doc<"matches">, seat: number, reason: string) {
  const rules = rulesFor(match.game);
  const winners = match.seats.map((_, i) => i).filter((i) => i !== seat);
  await db.patch(match._id, {
    status: "finished", result: { winners, reason }, turnDeadline: undefined, updatedAt: Date.now(),
  });
  await payPot(db, match, winners);
  await shuffleEnded(db, match, winners);
  for (const i of winners) {
    const row = await memberOf(db, match.roomId, match.seats[i].playerId);
    if (row && !row.kicked) await addPoints(db, row, match.game, rules.points.win);
  }
}

// Normal moves and timeout auto-moves share timer, result and leaderboard handling.
async function applyMove(ctx: MutationCtx, match: Doc<"matches">, seat: number, action: unknown) {
  const rules = rulesFor(match.game);
  let state;
  try {
    state = rules.act(match.state, seat, action ?? {});
  } catch (e) {
    // Rule errors are written for campers; ConvexError keeps them readable in production
    throw new ConvexError(e instanceof Error ? e.message : "That move is not allowed.");
  }
  const outcome = rules.outcome(state);
  if (!outcome) {
    await ctx.db.patch(match._id, { state, ...await turnTimer(ctx, match, state), updatedAt: Date.now() });
    return;
  }
  await ctx.db.patch(match._id, {
    state, status: "finished", result: outcome, turnDeadline: undefined, updatedAt: Date.now(),
  });
  await payPot(ctx.db, match, outcome.winners);
  await shuffleEnded(ctx.db, match, outcome.winners);
  // Points go straight onto the room leaderboard
  const draw = outcome.winners.length === 0;
  for (let i = 0; i < match.seats.length; i++) {
    const points = draw ? rules.points.draw : outcome.winners.includes(i) ? rules.points.win : 0;
    const row = await memberOf(ctx.db, match.roomId, match.seats[i].playerId);
    if (row && !row.kicked) await addPoints(ctx.db, row, match.game, points);
  }
}

// Called when a camper leaves or is removed from the room
export async function forfeitAll(db: DatabaseWriter, roomId: Id<"rooms">, playerId: string) {
  const live = await db
    .query("matches")
    .withIndex("by_room", (q) => q.eq("roomId", roomId).eq("status", "playing"))
    .collect();
  for (const m of live) {
    const seat = seatOf(m, playerId);
    if (seat !== null) await forfeit(db, m, seat, `${m.seats[seat].name} left the room.`);
  }
}

// Start a game and invite campers from your room
export const create = mutation({
  args: {
    code: v.string(),
    playerId: v.string(),
    game: v.string(),
    invite: v.array(v.id("roomPlayers")),
    stake: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rules = rulesFor(args.game);
    const stake = args.stake ?? 0;
    if (stake && !STAKES.includes(stake)) throw new ConvexError("Pick one of the chip stakes.");
    const { room, me } = await requireMember(ctx.db, args.code, args.playerId);
    if (args.invite.length < 1) throw new ConvexError("Pick who to play with.");
    if (args.invite.length > rules.max - 1) throw new ConvexError(`Up to ${rules.max} players in this game.`);
    const invited: string[] = [];
    for (const id of args.invite) {
      const row = await ctx.db.get(id);
      if (!row || row.roomId !== room._id || row.kicked) throw new ConvexError("That camper is not in your room.");
      if (row.playerId === args.playerId) throw new ConvexError("You can't invite yourself.");
      invited.push(row.playerId);
    }
    // One open game per camper: cancel my older waiting ones
    const waiting = await ctx.db
      .query("matches")
      .withIndex("by_room", (q) => q.eq("roomId", room._id).eq("status", "waiting"))
      .collect();
    for (const m of waiting) if (m.creatorId === args.playerId) { await ctx.db.patch(m._id, { status: "cancelled" }); await callOff(ctx.db, m); }

    const paid = await chargeEntry(ctx.db, args.playerId, args.game, `${args.game} online game`);
    if (stake) await takeStake(ctx.db, args.playerId, stake, args.game);
    const now = Date.now();
    return ctx.db.insert("matches", {
      paid,
      ...(stake ? { stake, staked: [args.playerId], houseCut: (await casino(ctx.db)).houseCut } : {}),
      roomId: room._id,
      game: args.game,
      creatorId: args.playerId,
      seats: [{ playerId: args.playerId, name: me.name, avatar: me.avatar }],
      invited,
      status: "waiting",
      round: 1,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Games I've been invited to and haven't joined yet
export const invites = query({
  args: { code: v.string(), playerId: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code.trim().toUpperCase()))
      .order("desc")
      .first();
    if (!room) return [];
    const waiting = await ctx.db
      .query("matches")
      .withIndex("by_room", (q) => q.eq("roomId", room._id).eq("status", "waiting"))
      .collect();
    const cutoff = Date.now() - INVITE_MS;
    return waiting
      .filter((m) => m.createdAt > cutoff && m.invited.includes(args.playerId) && seatOf(m, args.playerId) === null)
      .map((m) => ({ id: m._id, game: m.game, from: m.seats[0].name, fromAvatar: m.seats[0].avatar, stake: m.stake ?? 0 }));
  },
});

// My latest unfinished game of this kind, so a refresh drops back in
export const mine = query({
  args: { code: v.string(), playerId: v.string(), game: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code.trim().toUpperCase()))
      .order("desc")
      .first();
    if (!room) return null;
    for (const status of ["playing", "waiting"] as const) {
      const rows = await ctx.db
        .query("matches")
        .withIndex("by_room", (q) => q.eq("roomId", room._id).eq("status", status))
        .order("desc")
        .take(50);
      const hit = rows.find((m) => m.game === args.game && seatOf(m, args.playerId) !== null);
      if (hit) return hit._id;
    }
    return null;
  },
});

export const join = mutation({
  args: { matchId: v.id("matches"), playerId: v.string() },
  handler: async (ctx, args) => {
    const match = await load(ctx.db, args.matchId);
    if (match.status !== "waiting") throw new ConvexError("That game already started.");
    if (seatOf(match, args.playerId) !== null) return null;
    if (!match.invited.includes(args.playerId)) throw new ConvexError("You weren't invited to this game.");
    const me = await memberOf(ctx.db, match.roomId, args.playerId);
    if (!me || me.kicked) throw new ConvexError("Join the room first.");
    const rules = rulesFor(match.game);
    if (match.seats.length >= rules.max) throw new ConvexError("That game is full.");
    const seats = [...match.seats, { playerId: args.playerId, name: me.name, avatar: me.avatar }];
    if (match.stake) await takeStake(ctx.db, args.playerId, match.stake, match.game);
    const staked = match.stake ? [...(match.staked ?? []), args.playerId] : match.staked;
    const paid = [...(match.paid ?? []), ...await chargeEntry(ctx.db, args.playerId, match.game, `${match.game} online game`)];
    const next = { ...match, seats, paid, staked };
    // Everyone invited is in: deal and go
    const everyone = seats.length === match.invited.length + 1;
    await ctx.db.patch(match._id, everyone ? { seats, paid, staked, ...await start(ctx, next) } : { seats, paid, staked, updatedAt: Date.now() });
    return null;
  },
});

export const decline = mutation({
  args: { matchId: v.id("matches"), playerId: v.string() },
  handler: async (ctx, args) => {
    const match = await load(ctx.db, args.matchId);
    if (match.status !== "waiting" || !match.invited.includes(args.playerId)) return null;
    const invited = match.invited.filter((id) => id !== args.playerId);
    const pending = invited.filter((id) => !match.seats.some((s) => s.playerId === id)).length;
    const rules = rulesFor(match.game);
    if (match.seats.length + pending < rules.min) {
      // Not enough campers left to play: call it off
      await ctx.db.patch(match._id, { invited, status: "cancelled", updatedAt: Date.now() });
      await callOff(ctx.db, match);
    } else if (pending === 0) {
      // Everyone else already joined: deal
      await ctx.db.patch(match._id, { invited, ...await start(ctx, match) });
    } else {
      await ctx.db.patch(match._id, { invited, updatedAt: Date.now() });
    }
    return null;
  },
});

// The creator can start early once enough campers are in (card games)
export const begin = mutation({
  args: { matchId: v.id("matches"), playerId: v.string() },
  handler: async (ctx, args) => {
    const match = await load(ctx.db, args.matchId);
    if (match.creatorId !== args.playerId) throw new ConvexError("Only whoever started the game can deal.");
    if (match.status !== "waiting") return null;
    if (match.seats.length < rulesFor(match.game).min) throw new ConvexError("Wait for someone to join.");
    await ctx.db.patch(match._id, await start(ctx, match));
    return null;
  },
});

export const cancel = mutation({
  args: { matchId: v.id("matches"), playerId: v.string() },
  handler: async (ctx, args) => {
    const match = await load(ctx.db, args.matchId);
    if (match.status === "waiting" && match.creatorId === args.playerId) {
      await ctx.db.patch(match._id, { status: "cancelled", updatedAt: Date.now() });
      await callOff(ctx.db, match);
    }
    return null;
  },
});

export const act = mutation({
  args: { matchId: v.id("matches"), playerId: v.string(), action: v.any() },
  handler: async (ctx, args) => {
    const match = await load(ctx.db, args.matchId);
    if (match.status !== "playing") throw new ConvexError("This game is not in progress.");
    const seat = seatOf(match, args.playerId);
    if (seat === null) throw new ConvexError("You are not in this game.");
    const member = await memberOf(ctx.db, match.roomId, args.playerId);
    if (!member || member.kicked) throw new ConvexError("You are no longer in this room.");
    if (match.turnDeadline !== undefined && Date.now() >= match.turnDeadline) {
      throw new ConvexError("Time is up for that turn.");
    }
    await applyMove(ctx, match, seat, args.action);
    return null;
  },
});

export const expire = internalMutation({
  args: { matchId: v.id("matches"), moveNo: v.number() },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.status !== "playing" || match.moveNo !== args.moveNo) return null;
    const rules = rulesFor(match.game);
    const seat = rules.turn(match.state);
    if (seat === null) return null;
    if (rules.autoMove) {
      await applyMove(ctx, match, seat, rules.autoMove(match.state, seat));
    } else {
      await forfeit(ctx.db, match, seat, `${match.seats[seat].name} ran out of time.`);
    }
    return null;
  },
});

// Leaving a live game hands the win to the others
export const resign = mutation({
  args: { matchId: v.id("matches"), playerId: v.string() },
  handler: async (ctx, args) => {
    const match = await load(ctx.db, args.matchId);
    const seat = seatOf(match, args.playerId);
    if (match.status !== "playing" || seat === null) return null;
    await forfeit(ctx.db, match, seat, `${match.seats[seat].name} left the game.`);
    return null;
  },
});

// Same campers, fresh game, seats rotated so someone else starts
export const rematch = mutation({
  args: { matchId: v.id("matches"), playerId: v.string() },
  handler: async (ctx, args) => {
    const match = await load(ctx.db, args.matchId);
    if (match.status !== "finished") return null;
    if (seatOf(match, args.playerId) === null) throw new ConvexError("You are not in this game.");
    // Shuffle games deal the next round from the queue instead
    if (match.shuffle) throw new ConvexError("The shuffle is finding your next game.");
    // Each chip game is its own bet: everyone agrees to a new stake by starting a new game
    if (match.stake) throw new ConvexError("Start a new game to play for chips again.");
    const seats = [...match.seats.slice(1), match.seats[0]];
    await ctx.db.patch(match._id, { seats, round: match.round + 1, ...await start(ctx, { ...match, seats }) });
    return null;
  },
});

// What one camper may see: names and avatars, never secret ids or other hands
export const get = query({
  args: { matchId: v.id("matches"), playerId: v.string() },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return null;
    const rules = RULES[match.game];
    if (!rules) return null;
    const seat = seatOf(match, args.playerId);
    const rows = await Promise.all(match.seats.map((s) => memberOf(ctx.db, match.roomId, s.playerId)));
    const invitedNames: string[] = [];
    for (const id of match.invited) {
      if (match.seats.some((s) => s.playerId === id)) continue;
      const row = await memberOf(ctx.db, match.roomId, id);
      if (row) invitedNames.push(row.name);
    }
    return {
      id: match._id,
      game: match.game,
      status: match.status,
      round: match.round,
      seat,
      isCreator: match.creatorId === args.playerId,
      min: rules.min,
      seats: match.seats.map((s, i) => ({
        name: s.name,
        avatar: s.avatar,
        online: rows[i] ? isOnline(rows[i]) : false,
      })),
      waitingFor: invitedNames,
      turn: match.status === "playing" ? rules.turn(match.state) : null,
      turnDeadline: match.turnDeadline ?? null,
      serverNow: Date.now(),
      view: match.state === undefined ? null : rules.view(match.state, seat),
      result: match.result ?? null,
      points: rules.points,
      stake: match.stake ?? 0,
      pot: (match.stake ?? 0) * Math.max(match.staked?.length ?? 0, match.seats.length),
      houseCut: match.houseCut ?? 0,
      won: match.payout && seat !== null ? match.payout.seats[seat] ?? 0 : null,
      shuffle: match.shuffle ?? false,
    };
  },
});
