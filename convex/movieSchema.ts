import { defineTable } from 'convex/server';
import { v } from 'convex/values';

// Movie night: admins put up a list, each registered camper gets one vote
export const movieTables = {
  movies: defineTable({ title: v.string(), key: v.string(), createdAt: v.number() }).index('by_key', ['key']),
  movieVotes: defineTable({ movieId: v.id('movies'), accountId: v.id('accounts'), createdAt: v.number() })
    .index('by_account', ['accountId']).index('by_movie', ['movieId']),
  movieSettings: defineTable({ key: v.literal('vote'), open: v.boolean() }).index('by_key', ['key']),
};
