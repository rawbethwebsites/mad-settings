import { mutation, query } from "./_generated/server";
import type { DatabaseReader, DatabaseWriter } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { v, ConvexError } from "convex/values";
import { Chess } from "chess.js";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const STALE_GAME_MS = 24 * 60 * 60 * 1000;
const ONLINE_MS = 45 * 1000;
const INVITE_MS = 2 * 60 * 1000;

type Seat = "w" | "b";

function randomCode() {
  let code = "";
  for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

function cleanName(name: string) {
  const n = name.trim().slice(0, 24);
  if (n.length < 1) throw new ConvexError("Enter your name.");
  return n;
}

function cleanId(id: string) {
  if (id.length < 8 || id.length > 64) throw new ConvexError("Invalid player.");
  return id;
}

async function byCode(db: DatabaseReader, code: string) {
  return db
    .query("chessGames")
    .withIndex("by_code", (q) => q.eq("code", code.trim().toUpperCase()))
    .first();
}

function replay(moves: string[]) {
  const chess = new Chess();
  for (const m of moves) chess.move(m);
  return chess;
}

function seatOf(game: Doc<"chessGames">, playerId: string): Seat | null {
  if (game.white?.id === playerId) return "w";
  if (game.black?.id === playerId) return "b";
  return null;
}

function drawReason(chess: Chess) {
  if (chess.isStalemate()) return "Stalemate. Nobody can move.";
  if (chess.isInsufficientMaterial()) return "Not enough pieces left to finish the job.";
  if (chess.isThreefoldRepetition()) return "Same position three times.";
  return "Fifty moves with no progress.";
}

async function uniqueCode(db: DatabaseWriter) {
  for (let i = 0; i < 12; i++) {
    const candidate = randomCode();
    const existing = await byCode(db, candidate);
    if (!existing) return candidate;
    if (Date.now() - existing.updatedAt > STALE_GAME_MS) {
      await db.delete(existing._id);
      return candidate;
    }
  }
  throw new ConvexError("Could not start a game. Try again.");
}

/* ---------- presence ---------- */

export const ping = mutation({
  args: { playerId: v.string(), name: v.string(), avatar: v.string(), busy: v.boolean() },
  handler: async (ctx, args) => {
    const playerId = cleanId(args.playerId);
    const row = {
      playerId,
      name: cleanName(args.name),
      avatar: args.avatar.slice(0, 8),
      busy: args.busy,
      lastSeen: Date.now(),
    };
    const existing = await ctx.db
      .query("chessPresence")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .first();
    if (existing) await ctx.db.patch(existing._id, row);
    else await ctx.db.insert("chessPresence", row);
    return null;
  },
});

export const leave = mutation({
  args: { playerId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("chessPresence")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .first();
    if (existing) await ctx.db.delete(existing._id);
    return null;
  },
});

// Everyone else who is on the lobby right now
export const online = query({
  args: { playerId: v.string() },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - ONLINE_MS;
    const rows = await ctx.db.query("chessPresence").collect();
    return rows
      .filter((r) => r.playerId !== args.playerId && r.lastSeen > cutoff)
      .sort((a, b) => Number(a.busy) - Number(b.busy) || a.name.localeCompare(b.name))
      .map((r) => ({ id: r._id, name: r.name, avatar: r.avatar, busy: r.busy }));
  },
});

/* ---------- invites ---------- */

export const invite = mutation({
  args: {
    playerId: v.string(),
    name: v.string(),
    avatar: v.string(),
    toId: v.id("chessPresence"),
    side: v.union(v.literal("w"), v.literal("b"), v.literal("random")),
  },
  handler: async (ctx, args) => {
    const playerId = cleanId(args.playerId);
    const me = { id: playerId, name: cleanName(args.name), avatar: args.avatar.slice(0, 8) };

    const target = await ctx.db.get(args.toId);
    if (!target || target.lastSeen < Date.now() - ONLINE_MS) throw new ConvexError("That camper just went offline.");
    if (target.busy) throw new ConvexError("That camper is already in a game.");
    if (target.playerId === playerId) throw new ConvexError("You can't invite yourself.");

    // One open invite at a time
    const mine = await ctx.db
      .query("chessInvites")
      .withIndex("by_from", (q) => q.eq("fromPlayerId", playerId))
      .collect();
    for (const inv of mine) {
      if (inv.status === "pending") await ctx.db.patch(inv._id, { status: "cancelled" });
    }

    const hostSide: Seat = args.side === "random" ? (Math.random() < 0.5 ? "w" : "b") : args.side;
    const code = await uniqueCode(ctx.db);
    const now = Date.now();
    await ctx.db.insert("chessGames", {
      code,
      round: 1,
      hostSide,
      status: "waiting",
      moves: [],
      ...(hostSide === "w" ? { white: me } : { black: me }),
      createdAt: now,
      updatedAt: now,
    });
    const inviteId = await ctx.db.insert("chessInvites", {
      fromPlayerId: playerId,
      fromName: me.name,
      fromAvatar: me.avatar,
      toPlayerId: target.playerId,
      toName: target.name,
      code,
      status: "pending",
      createdAt: now,
    });
    return { inviteId, code };
  },
});

// Invites waiting for me
export const incoming = query({
  args: { playerId: v.string() },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - INVITE_MS;
    const rows = await ctx.db
      .query("chessInvites")
      .withIndex("by_to", (q) => q.eq("toPlayerId", args.playerId).eq("status", "pending"))
      .collect();
    return rows
      .filter((r) => r.createdAt > cutoff)
      .map((r) => ({ id: r._id, fromName: r.fromName, fromAvatar: r.fromAvatar, createdAt: r.createdAt }));
  },
});

// My latest invite, so the sender can see accepted / declined
export const outgoing = query({
  args: { playerId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("chessInvites")
      .withIndex("by_from", (q) => q.eq("fromPlayerId", args.playerId))
      .order("desc")
      .take(1);
    const inv = rows[0];
    if (!inv) return null;
    const expired = inv.status === "pending" && inv.createdAt < Date.now() - INVITE_MS;
    return {
      id: inv._id,
      toName: inv.toName,
      code: inv.code,
      status: expired ? ("cancelled" as const) : inv.status,
    };
  },
});

export const accept = mutation({
  args: { inviteId: v.id("chessInvites"), playerId: v.string(), name: v.string(), avatar: v.string() },
  handler: async (ctx, args) => {
    const playerId = cleanId(args.playerId);
    const inv = await ctx.db.get(args.inviteId);
    if (!inv || inv.toPlayerId !== playerId) throw new ConvexError("That invite is gone.");
    if (inv.status !== "pending" || inv.createdAt < Date.now() - INVITE_MS) {
      throw new ConvexError("That invite has expired.");
    }
    const game = await byCode(ctx.db, inv.code);
    if (!game || game.status !== "waiting") throw new ConvexError("That game is no longer available.");

    const guest = { id: playerId, name: cleanName(args.name), avatar: args.avatar.slice(0, 8) };
    await ctx.db.patch(game._id, {
      ...(game.white ? { black: guest } : { white: guest }),
      status: "playing",
      updatedAt: Date.now(),
    });
    await ctx.db.patch(inv._id, { status: "accepted" });
    return { code: game.code };
  },
});

export const decline = mutation({
  args: { inviteId: v.id("chessInvites"), playerId: v.string() },
  handler: async (ctx, args) => {
    const inv = await ctx.db.get(args.inviteId);
    if (!inv || inv.toPlayerId !== args.playerId || inv.status !== "pending") return null;
    await ctx.db.patch(inv._id, { status: "declined" });
    return null;
  },
});

export const cancel = mutation({
  args: { inviteId: v.id("chessInvites"), playerId: v.string() },
  handler: async (ctx, args) => {
    const inv = await ctx.db.get(args.inviteId);
    if (!inv || inv.fromPlayerId !== args.playerId || inv.status !== "pending") return null;
    await ctx.db.patch(inv._id, { status: "cancelled" });
    return null;
  },
});

/* ---------- games ---------- */

// Latest unfinished game I'm in, so a refresh or a locked phone drops back in
export const activeGame = query({
  args: { playerId: v.string() },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - STALE_GAME_MS;
    const asWhite = await ctx.db
      .query("chessGames")
      .withIndex("by_white", (q) => q.eq("white.id", args.playerId))
      .order("desc")
      .take(5);
    const asBlack = await ctx.db
      .query("chessGames")
      .withIndex("by_black", (q) => q.eq("black.id", args.playerId))
      .order("desc")
      .take(5);
    const open = [...asWhite, ...asBlack]
      .filter((g) => g.status === "playing" && g.updatedAt > cutoff)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return open[0]?.code ?? null;
  },
});

// What a client may see: never the other player's secret id
export const get = query({
  args: { code: v.string(), playerId: v.string() },
  handler: async (ctx, args) => {
    const game = await byCode(ctx.db, args.code);
    if (!game) return null;
    const pub = (p?: { name: string; avatar: string }) => (p ? { name: p.name, avatar: p.avatar } : null);
    return {
      code: game.code,
      round: game.round,
      status: game.status,
      moves: game.moves,
      you: seatOf(game, args.playerId),
      white: pub(game.white),
      black: pub(game.black),
      lastMove: game.lastMove ?? null,
      result: game.result ?? null,
    };
  },
});

export const move = mutation({
  args: {
    code: v.string(),
    playerId: v.string(),
    from: v.string(),
    to: v.string(),
    promotion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const game = await byCode(ctx.db, args.code);
    if (!game) throw new ConvexError("No game with that code.");
    if (game.status !== "playing") throw new ConvexError("This game is not in progress.");

    const seat = seatOf(game, args.playerId);
    if (!seat) throw new ConvexError("You are not in this game.");

    const chess = replay(game.moves);
    if (chess.turn() !== seat) throw new ConvexError("It is not your turn.");

    let played;
    try {
      played = chess.move({
        from: args.from,
        to: args.to,
        promotion: args.promotion as "q" | "r" | "b" | "n" | undefined,
      });
    } catch {
      throw new ConvexError("That move is not allowed.");
    }

    const patch: Partial<Doc<"chessGames">> = {
      moves: [...game.moves, played.san],
      lastMove: { from: played.from, to: played.to },
      updatedAt: Date.now(),
    };
    if (chess.isCheckmate()) {
      patch.status = "finished";
      patch.result = { winner: seat, reason: "Checkmate." };
    } else if (chess.isGameOver()) {
      patch.status = "finished";
      patch.result = { winner: "draw", reason: drawReason(chess) };
    }
    await ctx.db.patch(game._id, patch);
    return null;
  },
});

export const resign = mutation({
  args: { code: v.string(), playerId: v.string() },
  handler: async (ctx, args) => {
    const game = await byCode(ctx.db, args.code);
    if (!game) throw new ConvexError("No game with that code.");
    if (game.status !== "playing") return null;
    const seat = seatOf(game, args.playerId);
    if (!seat) throw new ConvexError("You are not in this game.");
    await ctx.db.patch(game._id, {
      status: "finished",
      result: { winner: seat === "w" ? "b" : "w", reason: "Resigned." },
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Same two campers, fresh board, colours swapped
export const rematch = mutation({
  args: { code: v.string(), playerId: v.string() },
  handler: async (ctx, args) => {
    const game = await byCode(ctx.db, args.code);
    if (!game) throw new ConvexError("No game with that code.");
    if (game.status !== "finished") return null;
    if (!seatOf(game, args.playerId)) throw new ConvexError("You are not in this game.");
    await ctx.db.patch(game._id, {
      round: game.round + 1,
      status: "playing",
      moves: [],
      white: game.black,
      black: game.white,
      lastMove: undefined,
      result: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

