import { mutation, query } from "./_generated/server";
import type { DatabaseReader } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v, ConvexError } from "convex/values";
import { TRIVIA } from "../src/data/triviaQuestions";
import { BINGO_WORDS } from "../src/data/gameContent";
import { addPoints, isRoomHost, memberOf, requireHost, roomByCode } from "./roomLib";

const QUESTION_MS = 20 * 1000;
const GRACE_MS = 2 * 1000;
const TRIVIA_COUNT = 10;
const FREE = "FREE";
// The five winning lines on a 5x5 card: 5 rows, 5 columns, 2 diagonals
const LINES: number[][] = [];
for (let r = 0; r < 5; r++) LINES.push([0, 1, 2, 3, 4].map((c) => r * 5 + c));
for (let c = 0; c < 5; c++) LINES.push([0, 1, 2, 3, 4].map((r) => r * 5 + c));
LINES.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);

function shuffled<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function loadRound(db: DatabaseReader, roundId: Id<"rounds">) {
  const round = await db.get(roundId);
  if (!round) throw new ConvexError("That round is gone.");
  return round;
}

function requireLive(round: Doc<"rounds">) {
  if (round.status !== "live") throw new ConvexError("That round has ended.");
}

function triviaIndex(round: Doc<"rounds">, q: number) {
  if (round.game !== "trivia") throw new ConvexError("That only works in trivia.");
  const index = round.items[q];
  if (typeof index !== "number") throw new ConvexError("No question here.");
  return index;
}

// The camper's entry in a round, or a readable error
async function myEntry(db: DatabaseReader, roundId: Id<"rounds">, playerId: string) {
  return db
    .query("roundEntries")
    .withIndex("by_round_player", (q) => q.eq("roundId", roundId).eq("playerId", playerId))
    .first();
}

export const start = mutation({
  args: { code: v.string(), playerId: v.string(), game: v.union(v.literal("trivia"), v.literal("bingo")) },
  handler: async (ctx, args) => {
    const { room } = await requireHost(ctx.db, args.code, args.playerId);
    // Only one live round per room: end whatever is running
    const live = await ctx.db
      .query("rounds")
      .withIndex("by_room", (q) => q.eq("roomId", room._id).eq("status", "live"))
      .collect();
    for (const r of live) await ctx.db.patch(r._id, { status: "ended" });

    const now = Date.now();
    const items =
      args.game === "trivia"
        ? shuffled([...TRIVIA.keys()]).slice(0, TRIVIA_COUNT)
        : []; // bingo: words are called as the host goes
    return ctx.db.insert("rounds", {
      roomId: room._id,
      game: args.game,
      status: "live",
      items,
      step: 0,
      phase: "question",
      stepStartedAt: now,
      winners: [],
      createdAt: now,
    });
  },
});

export const enter = mutation({
  args: { roundId: v.id("rounds"), playerId: v.string() },
  handler: async (ctx, args) => {
    const round = await loadRound(ctx.db, args.roundId);
    const me = await memberOf(ctx.db, round.roomId, args.playerId);
    if (!me || me.kicked) throw new ConvexError("Join the room first.");
    const existing = await myEntry(ctx.db, args.roundId, args.playerId);
    if (existing) return existing._id;
    const card =
      round.game === "bingo"
        ? (() => {
            const picked = shuffled(BINGO_WORDS).slice(0, 24);
            picked.splice(12, 0, FREE); // 25 cells, free space in the middle
            return picked;
          })()
        : [];
    return ctx.db.insert("roundEntries", {
      roundId: args.roundId,
      playerId: args.playerId,
      name: me.name,
      avatar: me.avatar,
      score: 0,
      answers: [],
      card,
    });
  },
});

export const answer = mutation({
  args: { roundId: v.id("rounds"), playerId: v.string(), q: v.number(), choice: v.number() },
  handler: async (ctx, args) => {
    const round = await loadRound(ctx.db, args.roundId);
    requireLive(round);
    if (round.phase !== "question") throw new ConvexError("Wait for the next question.");
    if (args.q !== round.step) throw new ConvexError("That question is over.");
    triviaIndex(round, args.q);
    if (Date.now() - round.stepStartedAt > QUESTION_MS + GRACE_MS) throw new ConvexError("Too slow — time's up.");
    if (args.choice < 0 || args.choice > 3) throw new ConvexError("Pick an answer.");
    const entry = await myEntry(ctx.db, args.roundId, args.playerId);
    if (!entry) throw new ConvexError("Join the round first.");
    if (entry.answers.some((a) => a.q === args.q)) throw new ConvexError("Locked in already.");
    await ctx.db.patch(entry._id, {
      answers: [...entry.answers, { q: args.q, choice: args.choice, ms: Date.now() - round.stepStartedAt }],
    });
    return null;
  },
});

export const reveal = mutation({
  args: { roundId: v.id("rounds"), playerId: v.string() },
  handler: async (ctx, args) => {
    const round = await loadRound(ctx.db, args.roundId);
    requireLive(round);
    triviaIndex(round, round.step);
    const room = await ctx.db.get(round.roomId);
    if (!room) throw new ConvexError("That room is gone.");
    if (!(await isRoomHost(ctx.db, room, args.playerId))) throw new ConvexError("Only the host can do that.");
    if (round.phase !== "question") return null;

    const correct = TRIVIA[triviaIndex(round, round.step)].answer;
    const entries = await ctx.db
      .query("roundEntries")
      .withIndex("by_round_player", (q) => q.eq("roundId", args.roundId))
      .collect();
    for (const entry of entries) {
      const answer = entry.answers.find((a) => a.q === round.step);
      if (!answer || answer.choice !== correct) continue;
      const secs = Math.min(20, Math.max(0, Math.floor(answer.ms / 1000)));
      const pts = 10 + (20 - secs);
      await ctx.db.patch(entry._id, { score: entry.score + pts });
      const row = await memberOf(ctx.db, round.roomId, entry.playerId);
      if (row && !row.kicked) await addPoints(ctx.db, row, "trivia", pts);
    }
    await ctx.db.patch(args.roundId, { phase: "reveal" });
    return null;
  },
});

export const next = mutation({
  args: { roundId: v.id("rounds"), playerId: v.string() },
  handler: async (ctx, args) => {
    const round = await loadRound(ctx.db, args.roundId);
    requireLive(round);
    const room = await ctx.db.get(round.roomId);
    if (!room) throw new ConvexError("That room is gone.");
    if (!(await isRoomHost(ctx.db, room, args.playerId))) throw new ConvexError("Only the host can do that.");

    if (round.game === "trivia") {
      if (round.step + 1 >= round.items.length) {
        await ctx.db.patch(args.roundId, { status: "ended" });
      } else {
        await ctx.db.patch(args.roundId, { step: round.step + 1, phase: "question", stepStartedAt: Date.now() });
      }
      return null;
    }

    // Bingo: call the next word nobody has heard yet
    const uncalled = BINGO_WORDS.filter((word) => !round.items.includes(word));
    if (uncalled.length === 0) throw new ConvexError("Every word has been called.");
    const word = uncalled[Math.floor(Math.random() * uncalled.length)];
    await ctx.db.patch(args.roundId, { items: [...round.items, word], step: round.step + 1, stepStartedAt: Date.now() });
    return null;
  },
});

export const claim = mutation({
  args: { roundId: v.id("rounds"), playerId: v.string(), cells: v.array(v.number()) },
  handler: async (ctx, args) => {
    const round = await loadRound(ctx.db, args.roundId);
    requireLive(round);
    if (round.game !== "bingo") throw new ConvexError("That only works in bingo.");
    const entry = await myEntry(ctx.db, args.roundId, args.playerId);
    if (!entry) throw new ConvexError("Join the round first.");
    if (round.winners.includes(entry.name)) throw new ConvexError("You already won this one.");
    if (entry.card.length !== 25) throw new ConvexError("No card dealt.");

    const cells = [...new Set(args.cells)].sort((a, b) => a - b);
    const line = LINES.find((l) => l.length === cells.length && l.every((c, i) => c === cells[i]));
    if (!line) throw new ConvexError("That's not a full line.");
    const called = round.items.filter((i): i is string => typeof i === "string");
    for (const c of line) {
      const word = entry.card[c];
      if (word !== FREE && !called.includes(word)) throw new ConvexError("That word hasn't been called.");
    }

    const place = round.winners.length;
    const pts = place === 0 ? 60 : place === 1 ? 40 : 20;
    await ctx.db.patch(args.roundId, { winners: [...round.winners, entry.name] });
    await ctx.db.patch(entry._id, { score: entry.score + pts });
    const row = await memberOf(ctx.db, round.roomId, args.playerId);
    if (row && !row.kicked) await addPoints(ctx.db, row, "bingo", pts);
    return { pts, place: place + 1 };
  },
});

export const end = mutation({
  args: { roundId: v.id("rounds"), playerId: v.string() },
  handler: async (ctx, args) => {
    const round = await loadRound(ctx.db, args.roundId);
    const room = await ctx.db.get(round.roomId);
    if (!room) throw new ConvexError("That room is gone.");
    if (!(await isRoomHost(ctx.db, room, args.playerId))) throw new ConvexError("Only the host can do that.");
    await ctx.db.patch(args.roundId, { status: "ended" });
    return null;
  },
});

// What one camper may see: question, their card, scores — never secret player ids
export const get = query({
  args: { roundId: v.id("rounds"), playerId: v.string() },
  handler: async (ctx, args) => {
    const round = await ctx.db.get(args.roundId);
    if (!round) return null;
    const room = await ctx.db.get(round.roomId);
    if (!room) return null;
    const entries = await ctx.db
      .query("roundEntries")
      .withIndex("by_round_player", (q) => q.eq("roundId", args.roundId))
      .collect();
    const mine = entries.find((e) => e.playerId === args.playerId) ?? null;
    const myAnswer = mine?.answers.find((a) => a.q === round.step) ?? null;

    const base = {
      id: round._id,
      status: round.status,
      step: round.step,
      phase: round.phase,
      stepStartedAt: round.stepStartedAt,
      now: Date.now(),
      entriesCount: entries.length,
      answeredCount: entries.filter((e) => e.answers.some((a) => a.q === round.step)).length,
      leaderboard: entries
        .map((e) => ({ name: e.name, avatar: e.avatar, score: e.score }))
        .sort((a, b) => b.score - a.score),
      me: { score: mine?.score ?? 0, myAnswer: myAnswer ? { choice: myAnswer.choice, ms: myAnswer.ms } : null },
      isHost: await isRoomHost(ctx.db, room, args.playerId),
    };

    if (round.game === "trivia") {
      const index = round.items[round.step];
      const question = typeof index === "number" ? TRIVIA[index] : null;
      return {
        ...base,
        game: "trivia" as const,
        total: round.items.length,
        question: question ? { q: question.q, options: question.options, category: question.category } : null,
        correct: round.phase === "reveal" && question ? question.answer : null,
      };
    }

    return {
      ...base,
      game: "bingo" as const,
      total: round.items.length,
      called: round.items.filter((i): i is string => typeof i === "string"),
      card: mine && mine.card.length === 25 ? mine.card : null,
      winners: round.winners,
    };
  },
});

// The live round in this room, so a refresh drops back in
export const current = query({
  args: { code: v.string(), playerId: v.string() },
  handler: async (ctx, args) => {
    const room = await roomByCode(ctx.db, args.code);
    if (!room) return null;
    const me = await memberOf(ctx.db, room._id, args.playerId);
    if (!me || me.kicked) return null;
    const live = await ctx.db
      .query("rounds")
      .withIndex("by_room", (q) => q.eq("roomId", room._id).eq("status", "live"))
      .order("desc")
      .first();
    return live ? live._id : null;
  },
});
