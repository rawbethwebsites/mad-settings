import { v, ConvexError } from 'convex/values';
import { mutation, query } from './_generated/server';
import { active, audit, paused, publicProfile, ranger, nameKey } from './connectLib';

const identity = { playerId: v.string() };
const targetArgs = { ...identity, target: v.id('connectProfiles') };
export const me = query({ args: identity, handler: async (ctx, { playerId }) => {
  const r = await ctx.db.query('rangers').withIndex('by_player', q => q.eq('playerId', playerId)).unique();
  if (!r) return null;
  try { await ranger(ctx.db, playerId, 'gate'); } catch { return null; }
  return { role: r.role };
} });
export const dashboard = query({ args: identity, handler: async (ctx, { playerId }) => {
  const role = await ranger(ctx.db, playerId, 'gate');
  const profiles = await ctx.db.query('connectProfiles').collect();
  const midnight = new Date(); midnight.setUTCHours(0, 0, 0, 0);
  const matches = await ctx.db.query('connectMatches').withIndex('by_created', q => q.gte('createdAt', midnight.getTime())).collect();
  const reports = await ctx.db.query('connectReports').withIndex('by_status', q => q.eq('status', 'open')).collect();
  const log = role.role === 'gateRanger' ? [] : await ctx.db.query('connectAuditLog').withIndex('by_created').order('desc').take(50);
  return { profiles: profiles.length, verified: profiles.filter(p => p.verified).length, matchesToday: matches.length, openReports: reports.length, messagingPaused: await paused(ctx.db), audit: log.map(l => ({ id: l._id, actor: l.actor, action: l.action, target: l.target ?? null, createdAt: l.createdAt })) };
} });
export const lookup = query({ args: { ...identity, campName: v.string() }, handler: async (ctx, { playerId, campName }) => {
  await ranger(ctx.db, playerId, 'gate');
  const key = nameKey(campName.trim());
  if (!key) return [];
  const profiles = await ctx.db.query('connectProfiles').withIndex('by_name', q => q.gte('nameKey', key).lt('nameKey', key + '\uffff')).take(30);
  return profiles.map(p => ({ ...publicProfile(p), banned: p.banned, hidden: p.hidden, suspended: p.suspended, mutedUntil: p.mutedUntil }));
} });
export const verify = mutation({ args: { ...targetArgs, verified: v.boolean() }, handler: async (ctx, { playerId, target, verified }) => {
  await ranger(ctx.db, playerId, 'gate');
  const p = await ctx.db.get(target);
  if (!p || !active(p)) throw new ConvexError('That camper is not available for verification.');
  await ctx.db.patch(target, { verified });
  await audit(ctx.db, playerId, verified ? 'verify-camper' : 'unverify-camper', p.campName); return null;
} });
export const photos = query({ args: identity, handler: async (ctx, { playerId }) => {
  await ranger(ctx.db, playerId);
  const profiles = await ctx.db.query('connectProfiles').take(1000);
  return profiles.flatMap(p => p.photos.filter(p => p.status === 'pending').map(photo => ({ profile: publicProfile(p), storageId: photo.storageId, url: '' }))).slice(0, 100);
} });
export const reviewPhoto = mutation({ args: { ...targetArgs, storageId: v.id('_storage'), approve: v.boolean() }, handler: async (ctx, { playerId, target, storageId, approve }) => {
  await ranger(ctx.db, playerId);
  const p = await ctx.db.get(target);
  if (!p || !p.photos.some(p => p.storageId === storageId)) throw new ConvexError('That photo is no longer in the queue.');
  await ctx.db.patch(target, { photos: p.photos.map(p => p.storageId === storageId ? { ...p, status: approve ? 'approved' as const : 'rejected' as const } : p) });
  await audit(ctx.db, playerId, approve ? 'approve-photo' : 'reject-photo', p.campName); return null;
} });
export const reports = query({ args: identity, handler: async (ctx, { playerId }) => {
  await ranger(ctx.db, playerId);
  const rows = await ctx.db.query('connectReports').withIndex('by_status', q => q.eq('status', 'open')).order('asc').take(100);
  return rows.map(r => ({ id: r._id, reason: r.reason, campName: r.campName, target: r.target, matchId: r.matchId ?? null, messageId: r.messageId ?? null, createdAt: r.createdAt, context: r.context, status: r.status }));
} });
// A mutation so opening sensitive reported chat is itself audited. Never accepts an arbitrary matchId.
export const reportedChat = mutation({ args: { ...identity, reportId: v.id('connectReports') }, handler: async (ctx, { playerId, reportId }) => {
  await ranger(ctx.db, playerId);
  const report = await ctx.db.get(reportId);
  if (!report || report.status !== 'open' || !report.matchId) throw new ConvexError('Only an open report about this chat allows a Ranger to read it.');
  const rows = await ctx.db.query('connectMessages').withIndex('by_match', q => q.eq('matchId', report.matchId!)).order('desc').take(150);
  const messages = [];
  for (const msg of rows.reverse()) {
    const p = await ctx.db.get(msg.sender);
    messages.push({ id: msg._id, body: msg.body, sticker: msg.sticker ?? null, campName: p?.campName ?? 'Deleted camper', createdAt: msg.createdAt });
  }
  await audit(ctx.db, playerId, 'view-reported-chat', report.campName); return { messages };
} });
export const resolveReport = mutation({ args: { ...identity, reportId: v.id('connectReports'), action: v.union(v.literal('dismiss'), v.literal('warn'), v.literal('mute'), v.literal('suspend'), v.literal('ban')), note: v.optional(v.string()) }, handler: async (ctx, { playerId, reportId, action, note }) => {
  await ranger(ctx.db, playerId, action === 'ban' ? 'head' : 'moderate');
  const report = await ctx.db.get(reportId);
  if (!report || report.status !== 'open') throw new ConvexError('That report has already been reviewed.');
  if (note && note.length > 300) throw new ConvexError('Keep Ranger notes under 300 characters.');
  const p = await ctx.db.get(report.target);
  const targetKey = p?.playerId ?? report.targetKey;
  if (targetKey) {
    const restriction = await ctx.db.query('connectRestrictions').withIndex('by_player', q => q.eq('playerId', targetKey)).unique();
    const remaining = await ctx.db.query('connectReports').withIndex('by_target', q => q.eq('target', report.target).eq('status', 'open')).collect();
    const hidden = new Set(remaining.filter(r => r._id !== reportId).map(r => r.reporterKey ?? r.reporter)).size >= 3;
    const state = { banned: (p?.banned ?? restriction?.banned ?? false) || action === 'ban', suspended: (p?.suspended ?? restriction?.suspended ?? false) || action === 'suspend', hidden, mutedUntil: action === 'mute' ? Date.now() + 24 * 60 * 60_000 : p?.mutedUntil ?? restriction?.mutedUntil ?? 0 };
    if (p) await ctx.db.patch(p._id, { ...state, ...(action === 'warn' ? { warning: note || 'A Ranger asks you to keep it kind. Follow the camp rules.' } : {}) });
    if (restriction) await ctx.db.patch(restriction._id, state);
    else await ctx.db.insert('connectRestrictions', { playerId: targetKey, ...state });
  }
  await ctx.db.patch(reportId, { status: 'resolved', action, note });
  await audit(ctx.db, playerId, `report-${action}`, report.campName, note); return null;
} });
export const pauseMessaging = mutation({ args: { ...identity, paused: v.boolean() }, handler: async (ctx, { playerId, paused }) => {
  await ranger(ctx.db, playerId, 'head');
  const state = await ctx.db.query('connectSettings').withIndex('by_key', q => q.eq('key', 'messaging')).unique();
  if (state) await ctx.db.patch(state._id, { paused });
  else await ctx.db.insert('connectSettings', { key: 'messaging', paused });
  await audit(ctx.db, playerId, paused ? 'pause-all-messaging' : 'resume-all-messaging'); return null;
} });
export const setRole = mutation({ args: { ...targetArgs, role: v.union(v.literal('ranger'), v.literal('gateRanger'), v.null()) }, handler: async (ctx, { playerId, target, role }) => {
  await ranger(ctx.db, playerId, 'head');
  const p = await ctx.db.get(target);
  if (!p || !active(p)) throw new ConvexError('Choose an active camper.');
  const existing = await ctx.db.query('rangers').withIndex('by_player', q => q.eq('playerId', p.playerId)).unique();
  if (existing?.role === 'headRanger') throw new ConvexError('The Head Ranger role is managed internally.');
  if (existing) { if (role) await ctx.db.patch(existing._id, { role }); else await ctx.db.delete(existing._id); }
  else if (role) await ctx.db.insert('rangers', { playerId: p.playerId, role, createdAt: Date.now() });
  await audit(ctx.db, playerId, `role-${role ?? 'remove'}`, p.campName); return null;
} });
export const restore = mutation({ args: targetArgs, handler: async (ctx, { playerId, target }) => {
  const p = await ctx.db.get(target);
  await ranger(ctx.db, playerId, p?.banned ? 'head' : 'moderate');
  if (!p) throw new ConvexError('That profile was deleted.');
  const r = await ctx.db.query('connectRestrictions').withIndex('by_player', q => q.eq('playerId', p.playerId)).unique();
  if (r) await ctx.db.patch(r._id, { banned: false, suspended: false, mutedUntil: 0 });
  await ctx.db.patch(target, { banned: false, suspended: false, mutedUntil: 0 });
  await audit(ctx.db, playerId, 'restore-camper', p.campName); return null;
} });
