import { ConvexError } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import type { DatabaseReader, DatabaseWriter } from './_generated/server';
import { cleanId } from './roomLib';
import type { ConnectMode } from './connectConstants';

export const nameKey = (name: string) => name.normalize('NFKC').toLowerCase().replace(/\s/g, '');
export const dayKey = () => new Date().toISOString().slice(0, 10); // limits reset at 00:00 UTC
export async function own(db: DatabaseReader, playerId: string) {
  cleanId(playerId);
  return db.query('connectProfiles').withIndex('by_player', q => q.eq('playerId', playerId)).unique();
}
export function active(p: Doc<'connectProfiles'>) { return !p.banned && !p.suspended && !p.hidden; }
export const ready = (p: Doc<'connectProfiles'>) => p.photos.some(p => p.status === 'approved');
export async function requireProfile(db: DatabaseReader, playerId: string, allowRestricted = false) {
  const p = await own(db, playerId);
  if (!p) throw new ConvexError('Create your camp profile first.');
  if (!allowRestricted && !active(p)) throw new ConvexError('Your profile is under Ranger review. Visit a Ranger for help.');
  return p;
}
export async function blocked(db: DatabaseReader, a: Id<'connectProfiles'>, b: Id<'connectProfiles'>) {
  const [ab, ba] = await Promise.all([
    db.query('connectBlocks').withIndex('by_pair', q => q.eq('from', a).eq('to', b)).first(),
    db.query('connectBlocks').withIndex('by_pair', q => q.eq('from', b).eq('to', a)).first(),
  ]);
  return !!(ab || ba);
}
export async function allMatches(db: DatabaseReader, id: Id<'connectProfiles'>) {
  const [a, b] = await Promise.all([
    db.query('connectMatches').withIndex('by_a', q => q.eq('a', id)).order('desc').take(200),
    db.query('connectMatches').withIndex('by_b', q => q.eq('b', id)).order('desc').take(200),
  ]);
  return [...a, ...b].sort((a, b) => b.createdAt - a.createdAt);
}
export async function matched(db: DatabaseReader, a: Id<'connectProfiles'>, b: Id<'connectProfiles'>, mode?: ConnectMode) {
  for (const [from, to] of [[a, b], [b, a]]) {
    const rows = db.query('connectMatches').withIndex('by_pair', q => q.eq('a', from).eq('b', to));
    const match = await rows.filter(q => mode ? q.and(q.eq(q.field('active'), true), q.eq(q.field('mode'), mode)) : q.eq(q.field('active'), true)).first();
    if (match) return match;
  }
  return null;
}
export function publicProfile(p: Doc<'connectProfiles'>, social = false, mine = false) {
  return {
    // Storage ids are permanent download capabilities. Peers receive display keys only.
    id: p._id, campName: p.campName, photos: p.photos.filter(p => mine || p.status === 'approved').map((photo, i) => ({ key: `photo-${i}`, status: photo.status })),
    modes: p.modes, prompts: p.prompts, tags: p.tags, visibility: p.visibility, verified: p.verified,
    ...(social || mine ? { socials: p.socials } : {}),
    ...(mine ? { dob: p.dob, banned: p.banned, hidden: p.hidden, suspended: p.suspended, mutedUntil: p.mutedUntil, warning: p.warning ?? null } : {}),
  };
}
export async function requireMatch(db: DatabaseReader, playerId: string, id: Id<'connectMatches'>) {
  const p = await requireProfile(db, playerId);
  const m = await db.get(id);
  if (!m || !m.active || (m.a !== p._id && m.b !== p._id)) throw new ConvexError('Tent Talk opens only after a mutual Log. This fire may have closed.');
  const peer = await db.get(m.a === p._id ? m.b : m.a);
  if (!peer || !active(peer) || await blocked(db, p._id, peer._id)) throw new ConvexError('This fire is no longer available.');
  return { p, m, peer };
}
export async function matchView(db: DatabaseReader, p: Doc<'connectProfiles'>, m: Doc<'connectMatches'>, peer: Doc<'connectProfiles'>) {
  const last = await db.query('connectMessages').withIndex('by_match', q => q.eq('matchId', m._id)).order('desc').first();
  return { id: m._id, mode: m.mode, peer: publicProfile(peer, true), createdAt: m.createdAt,
    lastMessage: last ? last.sticker || last.body : null,
    unread: !!last && last.sender !== p._id && last.createdAt > (m.a === p._id ? m.readA : m.readB) };
}
export async function usage(db: DatabaseReader, playerId: string) {
  return db.query('connectUsage').withIndex('by_day', q => q.eq('playerId', playerId).eq('day', dayKey())).unique();
}
export async function bump(db: DatabaseWriter, playerId: string, field: 'logs' | 'marshmallows' | 'backtracks' | 'uploads') {
  const limits = { logs: 100, marshmallows: 3, backtracks: 3, uploads: 20 };
  const labels = { logs: '100 Logs', marshmallows: '3 Marshmallows', backtracks: '3 Backtracks', uploads: '20 photo uploads' };
  const u = await usage(db, playerId);
  if ((u?.[field] ?? 0) >= limits[field]) throw new ConvexError(`You have used your ${labels[field]} today. Come back after midnight UTC.`);
  if (u) await db.patch(u._id, { [field]: u[field] + 1 });
  else await db.insert('connectUsage', { playerId, day: dayKey(), logs: 0, marshmallows: 0, backtracks: 0, uploads: 0, [field]: 1 });
}
export async function ranger(db: DatabaseReader, playerId: string, level: 'gate' | 'moderate' | 'head' = 'moderate') {
  cleanId(playerId);
  const r = await db.query('rangers').withIndex('by_player', q => q.eq('playerId', playerId)).unique();
  const restriction = await db.query('connectRestrictions').withIndex('by_player', q => q.eq('playerId', playerId)).unique();
  if (!r || restriction?.banned || restriction?.suspended || (level === 'head' && r.role !== 'headRanger') || (level === 'moderate' && r.role === 'gateRanger')) {
    throw new ConvexError('Only an authorized Ranger can do that.');
  }
  return r;
}
export async function audit(db: DatabaseWriter, playerId: string, action: string, target?: string, note?: string) {
  const p = await own(db, playerId);
  const r = await db.query('rangers').withIndex('by_player', q => q.eq('playerId', playerId)).unique();
  await db.insert('connectAuditLog', { actor: p?.campName ?? r?.role ?? 'Internal operator', action, target, note, createdAt: Date.now() });
}
export async function paused(db: DatabaseReader) {
  return !!(await db.query('connectSettings').withIndex('by_key', q => q.eq('key', 'messaging')).unique())?.paused;
}
export async function mayViewPhotos(db: DatabaseReader, playerId: string, target: Doc<'connectProfiles'>) {
  const viewer = await own(db, playerId);
  if (viewer?._id === target._id) return true;
  // Photo moderators may see pending/rejected photos, but not private messages or socials.
  const r = await db.query('rangers').withIndex('by_player', q => q.eq('playerId', playerId)).unique();
  if (r && r.role !== 'gateRanger') { await ranger(db, playerId); return true; }
  if (!viewer || !active(viewer) || !active(target) || await blocked(db, viewer._id, target._id)) return false;
  if (await matched(db, viewer._id, target._id)) return true;
  return target.visibility === 'everyone';
}
export async function photoModerator(db: DatabaseReader, playerId: string) {
  const r = await db.query('rangers').withIndex('by_player', q => q.eq('playerId', playerId)).unique();
  if (!r || r.role === 'gateRanger') return false;
  await ranger(db, playerId);
  return true;
}
export async function commonRoom(db: DatabaseReader, a: string, b: string) {
  const rows = await db.query('roomPlayers').withIndex('by_player', q => q.eq('playerId', a)).order('desc').take(30);
  for (const row of rows) {
    if (row.kicked) continue;
    const room = await db.get(row.roomId);
    if (!room || room.status !== 'open') continue;
    const peer = await db.query('roomPlayers').withIndex('by_room_player', q => q.eq('roomId', row.roomId).eq('playerId', b)).first();
    if (peer && !peer.kicked) return { code: room.code, target: peer._id };
  }
  return null;
}
