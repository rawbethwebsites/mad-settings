import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { connectMode, connectPhotoStatus, connectVisibility, rangerRole } from './connectConstants';

export const connectTables = {
  connectProfiles: defineTable({
    playerId: v.string(), campName: v.string(), nameKey: v.string(), dob: v.string(),
    photos: v.array(v.object({ storageId: v.id('_storage'), status: connectPhotoStatus })),
    modes: v.array(connectMode), prompts: v.array(v.object({ question: v.number(), answer: v.string() })),
    tags: v.array(v.string()), socials: v.object({ instagram: v.optional(v.string()), discord: v.optional(v.string()) }),
    visibility: connectVisibility, verified: v.boolean(), banned: v.boolean(), hidden: v.boolean(),
    suspended: v.boolean(), mutedUntil: v.number(), warning: v.optional(v.string()), createdAt: v.number(),
  }).index('by_player', ['playerId']).index('by_name', ['nameKey']),
  connectSwipes: defineTable({
    from: v.id('connectProfiles'), to: v.id('connectProfiles'), mode: connectMode,
    kind: v.union(v.literal('log'), v.literal('pass'), v.literal('marshmallow')),
    createdAt: v.number(), undone: v.boolean(),
  }).index('by_from_mode', ['from', 'mode', 'createdAt']).index('by_pair', ['from', 'to', 'mode'])
    .index('by_to', ['to']),
  connectMatches: defineTable({
    a: v.id('connectProfiles'), b: v.id('connectProfiles'), mode: connectMode,
    active: v.boolean(), messageCount: v.number(), createdAt: v.number(),
    readA: v.number(), readB: v.number(), notifiedA: v.boolean(), notifiedB: v.boolean(),
  }).index('by_a', ['a']).index('by_b', ['b']).index('by_pair', ['a', 'b', 'mode']).index('by_created', ['createdAt']),
  connectMessages: defineTable({
    matchId: v.id('connectMatches'), sender: v.id('connectProfiles'), body: v.string(),
    sticker: v.optional(v.string()), createdAt: v.number(),
  }).index('by_match', ['matchId', 'createdAt']).index('by_sender', ['sender'])
    .index('by_rate', ['matchId', 'sender', 'createdAt']),
  connectReactions: defineTable({
    messageId: v.id('connectMessages'), profileId: v.id('connectProfiles'), emoji: v.string(),
  }).index('by_message', ['messageId']).index('by_profile', ['profileId']),
  connectReports: defineTable({
    reporter: v.id('connectProfiles'), target: v.id('connectProfiles'),
    reporterKey: v.optional(v.string()), targetKey: v.optional(v.string()),
    matchId: v.optional(v.id('connectMatches')), messageId: v.optional(v.id('connectMessages')),
    reason: v.string(), context: v.string(), campName: v.string(), status: v.union(v.literal('open'), v.literal('resolved')),
    createdAt: v.number(), action: v.optional(v.string()), note: v.optional(v.string()),
  }).index('by_target', ['target', 'status']).index('by_status', ['status', 'createdAt'])
    .index('by_match', ['matchId']),
  connectBlocks: defineTable({ from: v.id('connectProfiles'), to: v.id('connectProfiles'), createdAt: v.number() })
    .index('by_from', ['from']).index('by_to', ['to']).index('by_pair', ['from', 'to']),
  rangers: defineTable({ playerId: v.string(), role: rangerRole, createdAt: v.number() }).index('by_player', ['playerId']),
  connectAuditLog: defineTable({ actor: v.string(), action: v.string(), target: v.optional(v.string()), note: v.optional(v.string()), createdAt: v.number() })
    .index('by_created', ['createdAt']),
  connectSettings: defineTable({ key: v.string(), paused: v.boolean() }).index('by_key', ['key']),
  connectUsage: defineTable({ playerId: v.string(), day: v.string(), logs: v.number(), marshmallows: v.number(), backtracks: v.number(), uploads: v.number() })
    .index('by_day', ['playerId', 'day']),
  // Survives profile deletion: deleting/recreating must not evade a ban, mute or suspension.
  connectRestrictions: defineTable({ playerId: v.string(), banned: v.boolean(), suspended: v.boolean(), hidden: v.optional(v.boolean()), mutedUntil: v.number() }).index('by_player', ['playerId']),
  // Opaque upload/photo tickets are bearer capabilities; only proxy routes accept them. No permanent storage URL leaves the server.
  connectUploads: defineTable({ profileId: v.id('connectProfiles'), expiresAt: v.number(), storageId: v.optional(v.id('_storage')), used: v.boolean() })
    .index('by_profile', ['profileId']).index('by_storage', ['storageId']),
  connectPhotoTickets: defineTable({ requester: v.string(), profileId: v.id('connectProfiles'), storageId: v.id('_storage'), expiresAt: v.number() })
    .index('by_requester', ['requester', 'profileId']).index('by_profile', ['profileId']),
};
