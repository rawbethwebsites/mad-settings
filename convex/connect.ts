import { v, ConvexError } from 'convex/values';
import { query, mutation, internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import { connectMode, connectVisibility, CONNECT_PROMPTS, CONNECT_TAGS, CONNECT_STICKERS, CONNECT_REACTIONS, PHOTO_TTL } from './connectConstants';
import { own, requireProfile, publicProfile, nameKey, active, blocked, usage, bump, matched, allMatches, requireMatch, matchView, paused, commonRoom, mayViewPhotos, photoModerator, audit } from './connectLib';
import { cleanId } from './roomLib';
import { cleanText, earlyContact } from './connectWords';

const identity = { playerId: v.string() };
const matchArgs = { ...identity, matchId: v.id('connectMatches') };
export const me = query({ args: identity, handler: async (ctx, { playerId }) => {
  const p = await own(ctx.db, playerId);
  return p ? { ...publicProfile(p, true, true), photos: p.photos } : null;
} });
export const saveProfile = mutation({ args: { ...identity, campName: v.string(), dob: v.string(), modes: v.array(connectMode), prompts: v.array(v.object({ question: v.number(), answer: v.string() })), tags: v.array(v.string()), socials: v.object({ instagram: v.optional(v.string()), discord: v.optional(v.string()) }), visibility: connectVisibility }, handler: async (ctx, args) => {
  cleanId(args.playerId);
  const p = await own(ctx.db, args.playerId);
  const restriction = await ctx.db.query('connectRestrictions').withIndex('by_player', q => q.eq('playerId', args.playerId)).unique();
  if (restriction?.banned || restriction?.suspended || restriction?.hidden || (p && !active(p))) throw new ConvexError('Your profile is under Ranger review.');
  const campName = cleanText(args.campName.replace(/\s+/g, ' '), 24);
  if (campName.length < 2 || !/^[\p{L}\p{N} ._'’-]+$/u.test(campName)) throw new ConvexError('Camp names need 2–24 letters, numbers or simple punctuation.');
  const key = nameKey(campName);
  const duplicate = await ctx.db.query('connectProfiles').withIndex('by_name', q => q.eq('nameKey', key)).unique();
  if (duplicate && duplicate._id !== p?._id) throw new ConvexError('That camp name is already by the fire. Pick another.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.dob)) throw new ConvexError('Enter a valid date of birth.');
  const birth = new Date(`${args.dob}T00:00:00Z`);
  if (!Number.isFinite(birth.getTime()) || birth.toISOString().slice(0, 10) !== args.dob) throw new ConvexError('Enter a valid date of birth.');
  const today = new Date();
  const age = today.getUTCFullYear() - birth.getUTCFullYear() - (today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate()) ? 1 : 0);
  if (age < 18 || age > 120) throw new ConvexError('MAD SETTINGS is 18+ only. You must be at least 18 to join.');
  if (p && p.dob !== args.dob) throw new ConvexError('Your date of birth cannot be changed. Ask a Ranger for help.');
  if (args.modes.length < 1 || args.modes.length > 2 || new Set(args.modes).size !== args.modes.length) throw new ConvexError('Choose Campfire, Squad, or both.');
  // Prompts are optional: 0, 1 or 2 answers, each to a different question; blank answers are dropped
  const given = args.prompts.filter(p => p.answer.trim());
  if (given.length > 2 || new Set(given.map(p => p.question)).size !== given.length || given.some(p => !Number.isInteger(p.question) || p.question < 0 || p.question >= CONNECT_PROMPTS.length)) throw new ConvexError('Pick up to two different questions.');
  const prompts = given.map(p => ({ question: p.question, answer: cleanText(p.answer, 120) }));
  if (args.tags.length > 5 || new Set(args.tags).size !== args.tags.length || args.tags.some(t => !(CONNECT_TAGS as readonly string[]).includes(t))) throw new ConvexError('Choose up to five vibe tags from the list.');
  const socials = { instagram: args.socials.instagram?.trim(), discord: args.socials.discord?.trim() };
  if ((socials.instagram && !/^@?[\w.]{1,30}$/.test(socials.instagram)) || (socials.discord && !/^[\w.#-]{2,40}$/.test(socials.discord))) throw new ConvexError('Use your Instagram or Discord handle, not a link.');
  const fields = { campName, nameKey: key, dob: args.dob, modes: args.modes, prompts, tags: args.tags, socials, visibility: args.visibility };
  if (p) { await ctx.db.patch(p._id, fields); return p._id; }
  return ctx.db.insert('connectProfiles', { ...fields, playerId: args.playerId, photos: [], verified: false, banned: false, hidden: false, suspended: false, mutedUntil: restriction?.mutedUntil ?? 0, createdAt: Date.now() });
} });

export const uploadUrl = mutation({ args: identity, handler: async (ctx, { playerId }) => {
  const p = await requireProfile(ctx.db, playerId);
  if (p.photos.length >= 4) throw new ConvexError('Four photos max. Remove one first.');
  await bump(ctx.db, playerId, 'uploads');
  const ticket = await ctx.db.insert('connectUploads', { profileId: p._id, expiresAt: Date.now() + 10 * 60_000, used: false });
  await ctx.scheduler.runAfter(11 * 60_000, internal.connectPhotos.expireUpload, { ticket });
  return `${process.env.CONVEX_SITE_URL}/connect/upload?ticket=${ticket}`;
} });
export const attachPhoto = mutation({ args: { ...identity, storageId: v.id('_storage') }, handler: async (ctx, { playerId, storageId }) => {
  const p = await requireProfile(ctx.db, playerId);
  const upload = await ctx.db.query('connectUploads').withIndex('by_storage', q => q.eq('storageId', storageId)).unique();
  if (!upload || upload.profileId !== p._id || upload.used || upload.expiresAt < Date.now()) throw new ConvexError('That upload expired or belongs to another camper. Upload again.');
  const meta = await ctx.db.system.get(storageId);
  if (!meta || !['image/jpeg', 'image/png', 'image/webp'].includes(meta.contentType ?? '') || meta.size > 5 * 1024 * 1024) throw new ConvexError('Use a JPEG, PNG or WebP photo up to 5 MB.');
  if (p.photos.length >= 4) throw new ConvexError('Four photos max. Remove one first.');
  await ctx.db.patch(p._id, { photos: [...p.photos, { storageId, status: 'pending' as const }] });
  await ctx.db.patch(upload._id, { used: true });
  return null;
} });
export const removePhoto = mutation({ args: { ...identity, storageId: v.id('_storage') }, handler: async (ctx, { playerId, storageId }) => {
  const p = await requireProfile(ctx.db, playerId, true);
  if (!p.photos.some(p => p.storageId === storageId)) throw new ConvexError('That photo is not yours.');
  await ctx.db.patch(p._id, { photos: p.photos.filter(p => p.storageId !== storageId) });
  await ctx.storage.delete(storageId);
  return null;
} });
export const photoUrls = mutation({ args: { ...identity, profileId: v.id('connectProfiles') }, handler: async (ctx, { playerId, profileId }) => {
  cleanId(playerId);
  const p = await ctx.db.get(profileId);
  const expiresAt = Date.now() + PHOTO_TTL;
  if (!p || !await mayViewPhotos(ctx.db, playerId, p)) return { photos: [], expiresAt };
  const isPrivate = p.playerId === playerId || await photoModerator(ctx.db, playerId);
  const old = await ctx.db.query('connectPhotoTickets').withIndex('by_requester', q => q.eq('requester', playerId).eq('profileId', profileId)).collect();
  const photos = [];
  for (const photo of p.photos.filter(p => isPrivate || p.status === 'approved')) {
    let ticket = old.find(t => t.storageId === photo.storageId && t.expiresAt > Date.now() + 45_000);
    if (!ticket) {
      const id = await ctx.db.insert('connectPhotoTickets', { requester: playerId, profileId, storageId: photo.storageId, expiresAt });
      await ctx.scheduler.runAfter(PHOTO_TTL + 1000, internal.connectPhotos.expirePhoto, { ticket: id });
      ticket = (await ctx.db.get(id))!;
    }
    photos.push({ storageId: isPrivate ? photo.storageId : `photo-${photos.length}`, status: photo.status, url: `${process.env.CONVEX_SITE_URL}/connect/photo?ticket=${ticket._id}` });
  }
  return { photos, expiresAt: Math.min(expiresAt, ...old.filter(t => t.expiresAt > Date.now() + 45_000).map(t => t.expiresAt)) };
} });
export const deck = query({ args: { ...identity, mode: connectMode }, handler: async (ctx, { playerId, mode }) => {
  const p = await own(ctx.db, playerId);
  const u = await usage(ctx.db, playerId);
  const limits = { logsLeft: 100 - (u?.logs ?? 0), marshmallowsLeft: 3 - (u?.marshmallows ?? 0), backtracksLeft: 3 - (u?.backtracks ?? 0), canLog: !!p && active(p) && p.visibility !== 'paused' && p.modes.includes(mode) };
  if (!p || !active(p) || p.visibility === 'paused') return { cards: [], ...limits };
  // Only show a deck for modes you have switched on in your profile
  if (!p.modes.includes(mode)) return { cards: [], modeOff: true, ...limits };
  const swiped = await ctx.db.query('connectSwipes').withIndex('by_from_mode', q => q.eq('from', p._id).eq('mode', mode)).take(2000);
  const seen = new Set(swiped.filter(s => !s.undone).map(s => s.to));
  const candidates = await ctx.db.query('connectProfiles').order('desc').take(1000); // newest campers first
  const cards = [];
  for (const peer of candidates) {
    if (peer._id === p._id || !active(peer) || peer.visibility !== 'everyone' || !peer.modes.includes(mode) || seen.has(peer._id) || await blocked(ctx.db, p._id, peer._id)) continue;
    if (await matched(ctx.db, p._id, peer._id, mode)) continue;
    const marshmallow = await ctx.db.query('connectSwipes').withIndex('by_pair', q => q.eq('from', peer._id).eq('to', p._id).eq('mode', mode)).filter(q => q.and(q.eq(q.field('undone'), false), q.eq(q.field('kind'), 'marshmallow'))).first();
    cards.push({ ...publicProfile(peer), sameRoom: !!await commonRoom(ctx.db, playerId, peer.playerId), marshmallow: !!marshmallow });
  }
  cards.sort((a, b) => Number(b.sameRoom) - Number(a.sameRoom) || Number(b.marshmallow) - Number(a.marshmallow));
  return { cards: cards.slice(0, 40), ...limits };
} });
export const swipe = mutation({ args: { ...identity, target: v.id('connectProfiles'), mode: connectMode, kind: v.union(v.literal('log'), v.literal('pass'), v.literal('marshmallow')) }, handler: async (ctx, { playerId, target, mode, kind }) => {
  const p = await requireProfile(ctx.db, playerId);
  const peer = await ctx.db.get(target);
  if (p.visibility === 'paused') throw new ConvexError('Your profile is paused. Unpause it in My camp to swipe.');
  if (!p.modes.includes(mode)) throw new ConvexError(`Turn on ${mode === 'squad' ? 'Squad' : 'Campfire'} in My camp to swipe here.`);
  if (!peer || peer._id === p._id || !active(peer) || peer.visibility !== 'everyone' || !peer.modes.includes(mode) || await blocked(ctx.db, p._id, target)) throw new ConvexError('That camper has left this Trail.');
  const previous = await ctx.db.query('connectSwipes').withIndex('by_pair', q => q.eq('from', p._id).eq('to', target).eq('mode', mode)).collect();
  if (previous.some(s => !s.undone)) throw new ConvexError('You already visited this camper. Use Backtrack first.');
  if (kind !== 'pass') await bump(ctx.db, playerId, 'logs');
  if (kind === 'marshmallow') await bump(ctx.db, playerId, 'marshmallows');
  await ctx.db.insert('connectSwipes', { from: p._id, to: target, mode, kind, createdAt: Date.now(), undone: false });
  if (kind === 'pass') return { matchId: null };
  const other = await ctx.db.query('connectSwipes').withIndex('by_pair', q => q.eq('from', target).eq('to', p._id).eq('mode', mode)).collect();
  if (!other.some(s => !s.undone && s.kind !== 'pass')) return { matchId: null };
  const existing = await matched(ctx.db, p._id, target, mode);
  if (existing) return { matchId: existing._id };
  const matchId = await ctx.db.insert('connectMatches', { a: p._id, b: target, mode, active: true, messageCount: 0, createdAt: Date.now(), readA: 0, readB: 0, notifiedA: false, notifiedB: false });
  return { matchId };
} });
export const backtrack = mutation({ args: { ...identity, mode: connectMode }, handler: async (ctx, { playerId, mode }) => {
  const p = await requireProfile(ctx.db, playerId);
  const last = await ctx.db.query('connectSwipes').withIndex('by_from_mode', q => q.eq('from', p._id).eq('mode', mode)).order('desc').filter(q => q.eq(q.field('undone'), false)).first();
  if (!last) throw new ConvexError('No footsteps to backtrack yet.');
  if (await matched(ctx.db, p._id, last.to, mode)) throw new ConvexError('That Log already lit a fire. Use Unmatch in Tent Talk instead.');
  await bump(ctx.db, playerId, 'backtracks');
  await ctx.db.patch(last._id, { undone: true });
  return null;
} });
export const listMatches = query({ args: identity, handler: async (ctx, { playerId }) => {
  const p = await own(ctx.db, playerId);
  if (!p || !active(p)) return [];
  const out = [];
  for (const m of await allMatches(ctx.db, p._id)) {
    if (!m.active) continue;
    const peer = await ctx.db.get(m.a === p._id ? m.b : m.a);
    if (peer && active(peer) && !await blocked(ctx.db, p._id, peer._id)) out.push(await matchView(ctx.db, p, m, peer));
  }
  return out;
} });
export const chat = query({ args: matchArgs, handler: async (ctx, { playerId, matchId }) => {
  // A null response also gracefully handles a fire closed while this screen is open.
  const p0 = await own(ctx.db, playerId);
  const m0 = await ctx.db.get(matchId);
  if (!p0 || !active(p0) || !m0 || !m0.active || (m0.a !== p0._id && m0.b !== p0._id)) return null;
  const peer0 = await ctx.db.get(m0.a === p0._id ? m0.b : m0.a);
  if (!peer0 || !active(peer0) || await blocked(ctx.db, p0._id, peer0._id)) return null;
  const { p, m, peer } = await requireMatch(ctx.db, playerId, matchId);
  const rows = await ctx.db.query('connectMessages').withIndex('by_match', q => q.eq('matchId', matchId)).order('desc').take(150);
  const messages = [];
  for (const row of rows.reverse()) {
    const reactions = await ctx.db.query('connectReactions').withIndex('by_message', q => q.eq('messageId', row._id)).take(20);
    messages.push({ id: row._id, body: row.body, sticker: row.sticker ?? null, mine: row.sender === p._id, createdAt: row.createdAt,
      reactions: CONNECT_REACTIONS.map(emoji => ({ emoji, count: reactions.filter(r => r.emoji === emoji).length, mine: reactions.some(r => r.emoji === emoji && r.profileId === p._id) })).filter(r => r.count > 0) });
  }
  const messagingPaused = await paused(ctx.db);
  return { match: await matchView(ctx.db, p, m, peer), messages, messageCount: m.messageCount, messagingPaused, canSend: !messagingPaused && p.mutedUntil <= Date.now(), challenge: await commonRoom(ctx.db, p.playerId, peer.playerId) };
} });
export const sendMessage = mutation({ args: { ...matchArgs, body: v.string(), sticker: v.optional(v.string()) }, handler: async (ctx, { playerId, matchId, body, sticker }) => {
  const { p, m } = await requireMatch(ctx.db, playerId, matchId);
  if (await paused(ctx.db)) throw new ConvexError('Rangers have paused messaging. Please check back shortly.');
  if (p.mutedUntil > Date.now()) throw new ConvexError('A Ranger muted your Tent Talk for 24 hours.');
  const recent = await ctx.db.query('connectMessages').withIndex('by_rate', q => q.eq('matchId', matchId).eq('sender', p._id).gt('createdAt', Date.now() - 60_000)).take(30);
  if (recent.length >= 30) throw new ConvexError('Easy by the fire: 30 messages per minute per chat. Wait a minute.');
  if (sticker && !(CONNECT_STICKERS as readonly string[]).includes(sticker)) throw new ConvexError('Pick a camp sticker from the tray.');
  const text = body.trim() ? cleanText(body, 500) : '';
  if (!text && !sticker) throw new ConvexError('Write a message or pick a sticker.');
  if (m.messageCount < 10 && earlyContact(text)) throw new ConvexError('Get to know each other first. Phone numbers and links unlock after 10 messages.');
  const now = Date.now();
  const id = await ctx.db.insert('connectMessages', { matchId, sender: p._id, body: text, sticker, createdAt: now });
  await ctx.db.patch(matchId, { messageCount: m.messageCount + 1, ...(m.a === p._id ? { readA: now } : { readB: now }) });
  return id;
} });
export const react = mutation({ args: { ...identity, messageId: v.id('connectMessages'), emoji: v.string() }, handler: async (ctx, { playerId, messageId, emoji }) => {
  const msg = await ctx.db.get(messageId);
  if (!msg) throw new ConvexError('That message is gone.');
  const { p } = await requireMatch(ctx.db, playerId, msg.matchId);
  if (await paused(ctx.db) || p.mutedUntil > Date.now()) throw new ConvexError('Messaging is paused for now.');
  if (!(CONNECT_REACTIONS as readonly string[]).includes(emoji)) throw new ConvexError('Choose a camp reaction.');
  const rows = await ctx.db.query('connectReactions').withIndex('by_message', q => q.eq('messageId', messageId)).take(20);
  const existing = rows.find(r => r.profileId === p._id && r.emoji === emoji);
  if (existing) await ctx.db.delete(existing._id);
  else await ctx.db.insert('connectReactions', { messageId, profileId: p._id, emoji });
  return null;
} });
export const markRead = mutation({ args: matchArgs, handler: async (ctx, { playerId, matchId }) => {
  const { p, m } = await requireMatch(ctx.db, playerId, matchId);
  await ctx.db.patch(m._id, m.a === p._id ? { readA: Date.now(), notifiedA: true } : { readB: Date.now(), notifiedB: true }); return null;
} });
export const unmatch = mutation({ args: matchArgs, handler: async (ctx, { playerId, matchId }) => {
  const { m } = await requireMatch(ctx.db, playerId, matchId);
  await ctx.db.patch(m._id, { active: false }); return null;
} });
export const block = mutation({ args: { ...identity, target: v.id('connectProfiles') }, handler: async (ctx, { playerId, target }) => {
  const p = await requireProfile(ctx.db, playerId, true);
  if (target === p._id || !await ctx.db.get(target)) throw new ConvexError('Choose another camper.');
  if (!await ctx.db.query('connectBlocks').withIndex('by_pair', q => q.eq('from', p._id).eq('to', target)).first()) await ctx.db.insert('connectBlocks', { from: p._id, to: target, createdAt: Date.now() });
  for (const m of await allMatches(ctx.db, p._id)) if (m.a === target || m.b === target) await ctx.db.patch(m._id, { active: false });
  return null;
} });
export const flag = mutation({ args: { ...identity, target: v.id('connectProfiles'), matchId: v.optional(v.id('connectMatches')), messageId: v.optional(v.id('connectMessages')), reason: v.string() }, handler: async (ctx, { playerId, target, matchId, messageId, reason }) => {
  const p = await requireProfile(ctx.db, playerId, true);
  const peer = await ctx.db.get(target);
  if (!peer || peer._id === p._id) throw new ConvexError('Choose another camper to flag.');
  if (matchId) {
    const m = await ctx.db.get(matchId);
    if (!m || ![m.a, m.b].includes(p._id) || ![m.a, m.b].includes(target)) throw new ConvexError('You can only flag your own Tent Talk.');
  }
  let context = `${peer.campName}: ${peer.prompts.map(p => p.answer).join(' / ')}`;
  if (messageId) {
    const msg = await ctx.db.get(messageId);
    if (!matchId || !msg || msg.matchId !== matchId || msg.sender !== target) throw new ConvexError('Choose a message from the camper you are flagging.');
    context = msg.sticker ? `${msg.sticker} ${msg.body}` : msg.body;
  }
  // One unresolved report per reporter/target prevents queue spam and inflated auto-hide counts.
  const previous = await ctx.db.query('connectReports').withIndex('by_target', q => q.eq('target', target).eq('status', 'open')).collect();
  if (previous.some(r => r.reporter === p._id || r.reporterKey === playerId)) throw new ConvexError('Your flag is already with the Rangers.');
  const id = await ctx.db.insert('connectReports', { reporter: p._id, target, reporterKey: playerId, targetKey: peer.playerId, matchId, messageId, reason: cleanText(reason, 300), context, campName: peer.campName, status: 'open', createdAt: Date.now() });
  if (new Set([...previous.map(r => r.reporterKey ?? r.reporter), playerId]).size >= 3) {
    await ctx.db.patch(target, { hidden: true });
    const restriction = await ctx.db.query('connectRestrictions').withIndex('by_player', q => q.eq('playerId', peer.playerId)).unique();
    if (restriction) await ctx.db.patch(restriction._id, { hidden: true });
    else await ctx.db.insert('connectRestrictions', { playerId: peer.playerId, banned: peer.banned, suspended: peer.suspended, mutedUntil: peer.mutedUntil, hidden: true });
  }
  return id;
} });
export const notifications = query({ args: identity, handler: async (ctx, { playerId }) => {
  const p = await own(ctx.db, playerId);
  if (!p || !active(p)) return [];
  const out = [];
  for (const m of await allMatches(ctx.db, p._id)) {
    if (!m.active || (m.a === p._id ? m.notifiedA : m.notifiedB)) continue;
    const peer = await ctx.db.get(m.a === p._id ? m.b : m.a);
    if (peer && active(peer) && !await blocked(ctx.db, p._id, peer._id)) out.push({ id: m._id, mode: m.mode, campName: peer.campName, createdAt: m.createdAt });
  }
  return out.slice(0, 5);
} });
export const ackNotification = mutation({ args: matchArgs, handler: async (ctx, { playerId, matchId }) => {
  const { p, m } = await requireMatch(ctx.db, playerId, matchId);
  await ctx.db.patch(m._id, m.a === p._id ? { notifiedA: true } : { notifiedB: true }); return null;
} });
export const deleteProfile = mutation({ args: identity, handler: async (ctx, { playerId }) => {
  const p = await requireProfile(ctx.db, playerId, true);
  for (const photo of p.photos) await ctx.storage.delete(photo.storageId);
  const uploads = await ctx.db.query('connectUploads').withIndex('by_profile', q => q.eq('profileId', p._id)).collect();
  for (const u of uploads) { if (u.storageId && !u.used) await ctx.storage.delete(u.storageId); await ctx.db.delete(u._id); }
  const [swipes, incoming, sent, blocks, blockedBy, reactions, tickets, requested] = await Promise.all([
    ctx.db.query('connectSwipes').withIndex('by_from_mode', q => q.eq('from', p._id)).collect(),
    ctx.db.query('connectSwipes').withIndex('by_to', q => q.eq('to', p._id)).collect(),
    ctx.db.query('connectMessages').withIndex('by_sender', q => q.eq('sender', p._id)).collect(),
    ctx.db.query('connectBlocks').withIndex('by_from', q => q.eq('from', p._id)).collect(),
    ctx.db.query('connectBlocks').withIndex('by_to', q => q.eq('to', p._id)).collect(),
    ctx.db.query('connectReactions').withIndex('by_profile', q => q.eq('profileId', p._id)).collect(),
    ctx.db.query('connectPhotoTickets').withIndex('by_profile', q => q.eq('profileId', p._id)).collect(),
    ctx.db.query('connectPhotoTickets').withIndex('by_requester', q => q.eq('requester', playerId)).collect(),
  ]);
  const ids = new Set([...swipes, ...incoming, ...sent, ...blocks, ...blockedBy, ...reactions, ...tickets, ...requested].map(d => d._id));
  for (const msg of sent) for (const r of await ctx.db.query('connectReactions').withIndex('by_message', q => q.eq('messageId', msg._id)).collect()) ids.add(r._id);
  for (const id of ids) await ctx.db.delete(id);
  const matchesA = await ctx.db.query('connectMatches').withIndex('by_a', q => q.eq('a', p._id)).collect();
  const matchesB = await ctx.db.query('connectMatches').withIndex('by_b', q => q.eq('b', p._id)).collect();
  for (const m of [...matchesA, ...matchesB]) await ctx.db.patch(m._id, { active: false });
  // Moderation evidence/audit and restrictions are retained; never expose them as ordinary camper data.
  await ctx.db.delete(p._id); return null;
} });
export const seedHeadRanger = internalMutation({ args: identity, handler: async (ctx, { playerId }) => {
  cleanId(playerId);
  if (await ctx.db.query('rangers').first()) throw new ConvexError('A Head Ranger already exists. Ask them to assign roles.');
  await ctx.db.insert('rangers', { playerId, role: 'headRanger', createdAt: Date.now() });
  await audit(ctx.db, playerId, 'seed-head-ranger'); return null;
} });
