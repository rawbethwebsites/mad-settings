import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { connectTables } from "./connectSchema";
import { walletTables } from "./walletSchema";
import { movieTables } from "./movieSchema";

export default defineSchema({
  ...connectTables,
  ...walletTables,
  ...movieTables,
  registrations: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    guests: v.number(),
    stay: v.union(v.literal("sleepover"), v.literal("day"), v.literal("undecided")),
    notes: v.optional(v.string()),
    source: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // Live two-phone Camp Chess games. Players are identified by a random id
  // kept in their own browser; ids are never sent back to clients.
  chessGames: defineTable({
    code: v.string(),
    round: v.number(),
    // Colour the host asked for; seats are fixed when a guest joins
    hostSide: v.union(v.literal("w"), v.literal("b")),
    status: v.union(v.literal("waiting"), v.literal("playing"), v.literal("finished")),
    moves: v.array(v.string()),
    white: v.optional(v.object({ id: v.string(), name: v.string(), avatar: v.string() })),
    black: v.optional(v.object({ id: v.string(), name: v.string(), avatar: v.string() })),
    lastMove: v.optional(v.object({ from: v.string(), to: v.string() })),
    // Play for chips: same shape as online matches (seats in payout are [white, black])
    stake: v.optional(v.number()),
    staked: v.optional(v.array(v.string())),
    houseCut: v.optional(v.number()),
    payout: v.optional(v.object({ house: v.number(), seats: v.array(v.number()) })),
    result: v.optional(
      v.object({
        winner: v.union(v.literal("w"), v.literal("b"), v.literal("draw")),
        reason: v.string(),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_white", ["white.id"])
    .index("by_black", ["black.id"]),

  // Campers currently on the chess lobby. `playerId` is the secret; clients
  // only ever see the document _id, which is what you invite.
  chessPresence: defineTable({
    playerId: v.string(),
    name: v.string(),
    avatar: v.string(),
    busy: v.boolean(),
    lastSeen: v.number(),
  }).index("by_player", ["playerId"]),

  chessInvites: defineTable({
    fromPlayerId: v.string(),
    fromName: v.string(),
    fromAvatar: v.string(),
    toPlayerId: v.string(),
    toName: v.string(),
    code: v.string(),
    stake: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("cancelled"),
    ),
    createdAt: v.number(),
  })
    .index("by_to", ["toPlayerId", "status"])
    .index("by_from", ["fromPlayerId"]),

  // Camp rooms: one group of campers plus the host who runs it.
  // `hostId` and `playerId` are secrets kept in each browser; clients only see document ids.
  rooms: defineTable({
    code: v.string(),
    name: v.string(),
    hostId: v.string(),
    status: v.union(v.literal("open"), v.literal("closed")),
    currentGame: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_code", ["code"]),

  roomPlayers: defineTable({
    roomId: v.id("rooms"),
    playerId: v.string(),
    name: v.string(),
    avatar: v.string(),
    isHost: v.boolean(),
    kicked: v.boolean(),
    lastSeen: v.number(),
    scores: v.record(v.string(), v.number()),
    total: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_room_player", ["roomId", "playerId"])
    .index("by_player", ["playerId"]),

  // Live games between campers in a room. `state` is the full game state from
  // src/lib/rules; clients only ever get rules.view(state, theirSeat).
  matches: defineTable({
    roomId: v.id("rooms"),
    game: v.string(),
    creatorId: v.string(),
    seats: v.array(v.object({ playerId: v.string(), name: v.string(), avatar: v.string() })),
    invited: v.array(v.string()),
    status: v.union(v.literal("waiting"), v.literal("playing"), v.literal("finished"), v.literal("cancelled")),
    state: v.optional(v.any()),
    round: v.number(),
    turnDeadline: v.optional(v.number()),
    moveNo: v.optional(v.number()),
    result: v.optional(v.object({ winners: v.array(v.number()), reason: v.string() })),
    // Campers charged an entry fee for this match (refunded if it never starts)
    paid: v.optional(v.array(v.object({ playerId: v.string(), amount: v.number() }))),
    // Play for chips: everyone puts in the same stake, the winner takes the pot minus the house cut
    stake: v.optional(v.number()),
    staked: v.optional(v.array(v.string())), // playerIds whose stake is in the pot
    houseCut: v.optional(v.number()), // percent, fixed when the game was set up
    payout: v.optional(v.object({ house: v.number(), seats: v.array(v.number()) })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_room", ["roomId", "status"]),

  // Host-led rounds everyone in the room plays at once (Trivia, Bingo)
  rounds: defineTable({
    roomId: v.id("rooms"),
    game: v.union(v.literal("trivia"), v.literal("bingo")),
    status: v.union(v.literal("live"), v.literal("ended")),
    // Trivia: question indexes; Bingo: words called so far
    items: v.array(v.union(v.number(), v.string())),
    step: v.number(),
    phase: v.union(v.literal("question"), v.literal("reveal")),
    stepStartedAt: v.number(),
    winners: v.array(v.string()),
    createdAt: v.number(),
  }).index("by_room", ["roomId", "status"]),

  roundEntries: defineTable({
    roundId: v.id("rounds"),
    playerId: v.string(),
    name: v.string(),
    avatar: v.string(),
    score: v.number(),
    answers: v.array(v.object({ q: v.number(), choice: v.number(), ms: v.number() })),
    card: v.array(v.string()),
  }).index("by_round_player", ["roundId", "playerId"]),
});
