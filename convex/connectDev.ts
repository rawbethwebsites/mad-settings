// Internal-only test controls. No public exports; refuse every non-DEV deployment.
import { ConvexError, v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import { audit, dayKey, requireProfile, usage } from './connectLib';

function devOnly() {
  if (process.env.CONVEX_SITE_URL !== 'https://joyous-pelican-468.convex.site') throw new ConvexError('Connect fixtures are restricted to the designated DEV deployment.');
}
export const prepareHead = internalMutation({ args: { playerId: v.string() }, handler: async (ctx, { playerId }) => {
  devOnly();
  const p = await requireProfile(ctx.db, playerId);
  if (!p.campName.startsWith('DEV ')) throw new ConvexError('Only a clearly labelled DEV fixture can be a test operator.');
  const existing = await ctx.db.query('rangers').withIndex('by_player', q => q.eq('playerId', playerId)).unique();
  if (!existing) await ctx.db.insert('rangers', { playerId, role: 'headRanger', createdAt: Date.now() });
  await audit(ctx.db, playerId, 'dev-fixture-head');
  return null;
} });
export const setUsage = internalMutation({ args: { playerId: v.string(), logs: v.number(), marshmallows: v.number(), backtracks: v.number() }, handler: async (ctx, args) => {
  devOnly();
  const p = await requireProfile(ctx.db, args.playerId);
  if (!p.campName.startsWith('DEV ')) throw new ConvexError('Not a DEV fixture.');
  const u = await usage(ctx.db, args.playerId);
  const fields = { logs: args.logs, marshmallows: args.marshmallows, backtracks: args.backtracks };
  if (u) await ctx.db.patch(u._id, fields);
  else await ctx.db.insert('connectUsage', { playerId: args.playerId, day: dayKey(), uploads: 0, ...fields });
  return null;
} });
export const expirePhotoTicket = internalMutation({ args: { ticket: v.id('connectPhotoTickets') }, handler: async (ctx, { ticket }) => {
  devOnly();
  const t = await ctx.db.get(ticket);
  const p = t ? await ctx.db.get(t.profileId) : null;
  if (!p?.campName.startsWith('DEV ')) throw new ConvexError('Not a DEV fixture.');
  await ctx.db.patch(ticket, { expiresAt: Date.now() - 1 });
  return null;
} });
export const inspect = internalQuery({ args: { profileId: v.id('connectProfiles') }, handler: async (ctx, { profileId }) => {
  devOnly();
  const swipes = await ctx.db.query('connectSwipes').withIndex('by_from_mode', q => q.eq('from', profileId)).collect();
  const incoming = await ctx.db.query('connectSwipes').withIndex('by_to', q => q.eq('to', profileId)).collect();
  const messages = await ctx.db.query('connectMessages').withIndex('by_sender', q => q.eq('sender', profileId)).collect();
  return { exists: !!await ctx.db.get(profileId), swipes: swipes.length + incoming.length, messages: messages.length };
} });
