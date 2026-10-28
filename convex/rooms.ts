import { internalMutation, mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import {
  addPoints,
  cleanAvatar,
  cleanId,
  cleanName,
  addToCamp,
  CAMP_CODE,
  isOnline,
  isRoomHost,
  memberOf,
  randomCode,
  requireHost,
  requireMember,
  roomByCode,
} from "./roomLib";
import { forfeitAll } from "./matches";

// Games that score on one phone (solo games, and any game vs the computer); the browser sends the points
const SOLO_GAMES = new Set([
  "minesweeper", "tenten", "chopchop", "puzzles", "search", "vault", "same", "chess", "bingo", "trivia",
  "tictactoe", "connect4", "dots", "ayo", "whot", "ocho", "ludo",
]);
const MAX_SOLO_POINTS = 300;

const player = { playerId: v.string(), name: v.string(), avatar: v.string() };

export const create = mutation({
  args: { ...player, roomName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const playerId = cleanId(args.playerId);
    const name = cleanName(args.name);
    let code = "";
    for (let i = 0; i < 20 && !code; i++) {
      const candidate = randomCode();
      const existing = await roomByCode(ctx.db, candidate);
      if (candidate !== CAMP_CODE && (!existing || existing.status === "closed")) code = candidate;
    }
    if (!code) throw new ConvexError("Could not make a room. Try again.");
    const now = Date.now();
    const roomId = await ctx.db.insert("rooms", {
      code,
      name: args.roomName?.trim().slice(0, 40) || `${name}'s camp`,
      hostId: playerId,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("roomPlayers", {
      roomId,
      playerId,
      name,
      avatar: cleanAvatar(args.avatar),
      isHost: true,
      kicked: false,
      lastSeen: now,
      scores: {},
      total: 0,
    });
    return { code };
  },
});

export const join = mutation({
  args: { ...player, code: v.string() },
  handler: async (ctx, args) => {
    const playerId = cleanId(args.playerId);
    const room = await roomByCode(ctx.db, args.code);
    if (!room) throw new ConvexError("No room with that code. Check it with your host.");
    if (room.status !== "open") throw new ConvexError("That room is closed.");
    if (room.code === CAMP_CODE) throw new ConvexError("The camp room is for registered campers. Log in to your camp account to join it.");
    const row = { name: cleanName(args.name), avatar: cleanAvatar(args.avatar), lastSeen: Date.now() };
    const existing = await memberOf(ctx.db, room._id, playerId);
    if (existing?.kicked) throw new ConvexError("The host removed you from this room.");
    // One name per camper in a room, ignoring case and spaces
    const key = (n: string) => n.toLowerCase().replace(/\s+/g, "");
    const others = await ctx.db
      .query("roomPlayers")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    if (others.some((r) => r.playerId !== playerId && !r.kicked && key(r.name) === key(row.name))) {
      throw new ConvexError(`Someone in this room is already called ${row.name}. Pick another name.`);
    }
    if (existing) await ctx.db.patch(existing._id, row);
    else {
      await ctx.db.insert("roomPlayers", {
        roomId: room._id,
        playerId,
        ...row,
        isHost: room.hostId === playerId,
        kicked: false,
        scores: {},
        total: 0,
      });
    }
    return { code: room.code };
  },
});

// A registered camper's way into the camp room (also called on every log in)
export const joinCamp = mutation({
  args: { playerId: v.string(), avatar: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const account = await ctx.db.query("accounts").withIndex("by_player_key", (q) => q.eq("playerKey", args.playerId)).unique();
    if (!account) throw new ConvexError("Log in to your camp account first.");
    if (account.status !== "approved") throw new ConvexError("Your camp account is on hold. Ask camp staff.");
    const code = await addToCamp(ctx.db, account, args.avatar);
    if (!code) throw new ConvexError("Camp staff removed you from the camp room.");
    return { code, name: account.name };
  },
});

// CLI only (npx convex run rooms:fillCamp): put every registered camper in the camp room
export const fillCamp = internalMutation({
  args: {},
  handler: async (ctx) => {
    const accounts = (await ctx.db.query("accounts").collect()).filter((a) => a.status === "approved");
    for (const a of accounts) await addToCamp(ctx.db, a);
    return { campers: accounts.length };
  },
});

// Every 15s from each phone. Tells the phone if it was removed or the room closed.
export const heartbeat = mutation({
  args: { code: v.string(), playerId: v.string() },
  handler: async (ctx, args) => {
    const room = await roomByCode(ctx.db, args.code);
    if (!room) return "missing" as const;
    if (room.status !== "open") return "closed" as const;
    const me = await memberOf(ctx.db, room._id, args.playerId);
    if (!me) return "missing" as const;
    if (me.kicked) return "kicked" as const;
    await ctx.db.patch(me._id, { lastSeen: Date.now() });
    return "ok" as const;
  },
});

export const leave = mutation({
  args: { code: v.string(), playerId: v.string() },
  handler: async (ctx, args) => {
    const room = await roomByCode(ctx.db, args.code);
    if (!room) return null;
    const me = await memberOf(ctx.db, room._id, args.playerId);
    if (me) await forfeitAll(ctx.db, room._id, args.playerId);
    // The host's row stays so the room keeps its host; it just goes offline
    if (me && !me.isHost && room.code !== CAMP_CODE) await ctx.db.delete(me._id);
    else if (me) await ctx.db.patch(me._id, { lastSeen: 0 });
    return null;
  },
});

export const kick = mutation({
  args: { code: v.string(), playerId: v.string(), target: v.id("roomPlayers") },
  handler: async (ctx, args) => {
    const { room } = await requireHost(ctx.db, args.code, args.playerId);
    const target = await ctx.db.get(args.target);
    if (!target || target.roomId !== room._id) throw new ConvexError("That camper is not in this room.");
    if (target.isHost) throw new ConvexError("You can't remove the host.");
    await ctx.db.patch(target._id, { kicked: true });
    await forfeitAll(ctx.db, room._id, target.playerId);
    return null;
  },
});

export const setGame = mutation({
  args: { code: v.string(), playerId: v.string(), game: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const { room } = await requireHost(ctx.db, args.code, args.playerId);
    await ctx.db.patch(room._id, { currentGame: args.game ?? undefined, updatedAt: Date.now() });
    return null;
  },
});

export const close = mutation({
  args: { code: v.string(), playerId: v.string() },
  handler: async (ctx, args) => {
    const { room } = await requireHost(ctx.db, args.code, args.playerId);
    if (room.code === CAMP_CODE) throw new ConvexError("The camp room stays open for every camper.");
    await ctx.db.patch(room._id, { status: "closed", updatedAt: Date.now() });
    return null;
  },
});

// Points from games played on one phone
export const award = mutation({
  args: { code: v.string(), playerId: v.string(), game: v.string(), points: v.number() },
  handler: async (ctx, args) => {
    if (!SOLO_GAMES.has(args.game)) throw new ConvexError("Unknown game.");
    const points = Math.min(MAX_SOLO_POINTS, Math.max(0, Math.round(args.points)));
    const { me } = await requireMember(ctx.db, args.code, args.playerId);
    await addPoints(ctx.db, me, args.game, points);
    return null;
  },
});

// Everything a room screen shows. Never returns anyone's secret id.
export const get = query({
  args: { code: v.string(), playerId: v.string() },
  handler: async (ctx, args) => {
    const room = await roomByCode(ctx.db, args.code);
    if (!room) return null;
    const rows = await ctx.db
      .query("roomPlayers")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    const me = rows.find((r) => r.playerId === args.playerId) ?? null;
    const round = await ctx.db
      .query("rounds")
      .withIndex("by_room", (q) => q.eq("roomId", room._id).eq("status", "live"))
      .order("desc")
      .first();
    return {
      code: room.code,
      name: room.name,
      status: room.status,
      currentGame: room.currentGame ?? null,
      round: round ? { id: round._id, game: round.game } : null,
      me: me ? { id: me._id, isHost: await isRoomHost(ctx.db, room, args.playerId), kicked: me.kicked } : null,
      camp: room.code === CAMP_CODE,
      players: rows
        .filter((r) => !r.kicked)
        .map((r) => ({
          id: r._id,
          name: r.name,
          avatar: r.avatar,
          isHost: r.isHost,
          online: isOnline(r),
          total: r.total,
          scores: r.scores,
        }))
        .sort((a, b) => Number(b.online) - Number(a.online) || b.total - a.total || a.name.localeCompare(b.name)),
    };
  },
});
