import { defineTable } from 'convex/server';
import { v } from 'convex/values';

// Play random campers: one row per camper in the battle-royale shuffle.
// waiting = in the queue, matched = in a game (matchId), won = won the last round, deciding whether to keep going.
export const shuffleTables = {
  shuffleQueue: defineTable({
    roomId: v.id('rooms'),
    playerId: v.string(),
    game: v.string(),
    name: v.string(),
    avatar: v.string(),
    status: v.union(v.literal('waiting'), v.literal('matched'), v.literal('won')),
    matchId: v.optional(v.id('matches')),
    lastWith: v.array(v.string()), // who they just played, so the next round prefers someone new
    round: v.number(), // rounds played this run
    wins: v.number(),
    joinedAt: v.number(),
    lastSeen: v.number(),
  })
    .index('by_room_game', ['roomId', 'game', 'status'])
    .index('by_player', ['playerId']),
};
