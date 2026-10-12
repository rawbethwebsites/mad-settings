import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
});
