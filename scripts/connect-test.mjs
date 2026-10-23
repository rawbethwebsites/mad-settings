// Run: NODE_OPTIONS=--dns-result-order=ipv4first node --env-file=.env.local scripts/connect-test.mjs
// Real, explicitly labelled DEV fixtures; never prints browser bearer capabilities.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { ConvexHttpClient } from '../node_modules/convex/dist/esm/browser/index.js';
import { api } from '../convex/_generated/api.js';

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
assert.equal(url, 'https://joyous-pelican-468.convex.cloud', 'Tests refuse non-designated-DEV deployments');
assert.ok(process.env.CONVEX_DEPLOYMENT?.startsWith('dev:'), 'DEV configuration required');
const client = new ConvexHttpClient(url, { logger: false });
const q = (name, args) => client.query(api.connect[name], args);
const m = (name, args) => client.mutation(api.connect[name], args);
const rq = (name, args) => client.query(api.connectRangers[name], args);
const rm = (name, args) => client.mutation(api.connectRangers[name], args);
const results = [];
const run = randomUUID().slice(0, 6);
const fixturePath = new URL('../docs/briefs/.connect-fixtures.local.json', import.meta.url);
const evidencePath = new URL('../docs/briefs/connect-node-results.json', import.meta.url);
const local = { run, deployment: url, campers: {}, matches: {} };
async function fetch(...args) {
  for (let attempt = 0; ; attempt++) {
    try { return await globalThis.fetch(...args); }
    catch (error) {
      // Retry connection establishment only, not ambiguous already-committed POSTs.
      if (attempt >= 1 || !['UND_ERR_CONNECT_TIMEOUT', 'ENETUNREACH', 'ECONNREFUSED'].includes(error.cause?.code)) throw error;
    }
  }
}
function record(name) { results.push({ name, passed: true }); console.log(`PASS ${name}`); }
async function test(name, fn) { await fn(); record(name); }
async function denied(fn, message) {
  let caught;
  try { await fn(); } catch (e) { caught = e; }
  assert.ok(caught, 'Expected the server to reject this action');
  if (message) assert.match(String(caught.data ?? caught.message), message);
}
function internal(name, args) {
  // Capture both streams: CLI arguments contain opaque browser capabilities.
  const out = execFileSync('npx', ['convex', 'run', name, JSON.stringify(args)], { cwd: new URL('..', import.meta.url), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_OPTIONS: '--dns-result-order=ipv4first' } });
  return out.trim() ? JSON.parse(out.trim()) : null;
}
function fields(f, overrides = {}) { return { playerId: f.playerId, campName: f.campName, dob: '1995-04-16', modes: ['campfire', 'squad'], prompts: [{ question: 0, answer: 'Sharing good stories' }, { question: 3, answer: 'Roasted corn by the fire' }], tags: ['Foodie', 'Night owl'], socials: { instagram: 'dev_camper' }, visibility: 'everyone', ...overrides }; }
async function camper(label) {
  const f = { playerId: randomUUID(), campName: `DEV ${label} ${run}` };
  f.id = await m('saveProfile', fields(f));
  local.campers[label] = f;
  return f;
}
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6VqQAAAAASUVORK5CYII=', 'base64');
async function upload(f, attach = true) {
  const uploadUrl = await m('uploadUrl', { playerId: f.playerId });
  const response = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: png });
  assert.equal(response.status, 200, 'Real DEV image upload');
  const { storageId } = await response.json();
  if (attach) await m('attachPhoto', { playerId: f.playerId, storageId });
  return storageId;
}
async function setupPhoto(f, head) {
  f.storageId = await upload(f);
  await rm('reviewPhoto', { playerId: head.playerId, target: f.id, storageId: f.storageId, approve: true });
  await rm('verify', { playerId: head.playerId, target: f.id, verified: true });
}
const deck = f => q('deck', { playerId: f.playerId, mode: 'campfire' });
const swipe = (a, b, kind = 'log', mode = 'campfire') => m('swipe', { playerId: a.playerId, target: b.id, kind, mode });
const flag = (a, b, extra = {}) => m('flag', { playerId: a.playerId, target: b.id, reason: 'DEV safety-rule verification', ...extra });
let originalPause = false;
let head;
let passed = false;
try {
  head = await camper('Head');
  writeFileSync(fixturePath, JSON.stringify(local, null, 2), { mode: 0o600 });
  try { internal('connect:seedHeadRanger', { playerId: head.playerId }); }
  catch { internal('connectDev:prepareHead', { playerId: head.playerId }); }
  assert.deepEqual(await rq('me', { playerId: head.playerId }), { role: 'headRanger' });
  originalPause = (await rq('dashboard', { playerId: head.playerId })).messagingPaused;
  if (originalPause) await rm('pauseMessaging', { playerId: head.playerId, paused: false });
  const a = await camper('Alice'); const b = await camper('Bob'); const c = await camper('Cedar'); const d = await camper('Drift'); const e = await camper('Ember'); const gate = await camper('Gate'); const ranger = await camper('Ranger');
  writeFileSync(fixturePath, JSON.stringify(local, null, 2), { mode: 0o600 });

  await test('Under-18 and invalid DOB rejected; adult birthday and immutable DOB enforced', async () => {
    await denied(() => m('saveProfile', fields({ playerId: randomUUID(), campName: `DEV Minor ${run}` }, { dob: '2015-01-01' })), /18\+/);
    await denied(() => m('saveProfile', fields({ playerId: randomUUID(), campName: `DEV Invalid ${run}` }, { dob: '2000-02-31' })), /valid date/);
    await denied(() => m('saveProfile', fields(a, { dob: '1990-01-01' })), /cannot be changed/);
  });
  await test('Camp name uniqueness is case, space and Unicode-normalization insensitive', async () => {
    await denied(() => m('saveProfile', fields({ playerId: randomUUID(), campName: a.campName.toLowerCase().replace(/ /g, '') })), /already by the fire/);
  });
  await test('Up to two distinct prompts, 120 characters, valid tags and no Spark mode', async () => {
    await denied(() => m('saveProfile', fields(a, { prompts: [{ question: 0, answer: 'Hello' }, { question: 0, answer: 'Again' }] })), /two different/);
    await denied(() => m('saveProfile', fields(a, { prompts: [{ question: 0, answer: 'x'.repeat(121) }, { question: 1, answer: 'Music' }] })), /120/);
    await denied(() => m('saveProfile', fields(a, { tags: ['Invalid vibe'] })), /vibe tags/);
    await denied(() => m('saveProfile', fields(a, { modes: ['spark'] })));
  });
  await test('Campers show before photo approval (photo hidden until approved); no verify gate to Like', async () => {
    a.storageId = await upload(a); b.storageId = await upload(b);
    const before = (await deck(a)).cards.find(p => p.id === b.id);
    assert.ok(before, 'unapproved camper still appears on the deck');
    assert.ok(!JSON.stringify(before).includes(String(b.storageId)), 'pending photo is not shown to others');
    assert.equal((await deck(a)).canLog, true, 'unverified campers can Like');
    await rm('reviewPhoto', { playerId: head.playerId, target: b.id, storageId: b.storageId, approve: true });
    assert.ok((await deck(a)).cards.some(p => p.id === b.id));
    await rm('reviewPhoto', { playerId: head.playerId, target: a.id, storageId: a.storageId, approve: true });
    for (const f of [a, b]) await rm('verify', { playerId: head.playerId, target: f.id, verified: true });
    for (const f of [c, d, e, gate, ranger]) await setupPhoto(f, head);
  });
  await test('Uploads are ownership-bound, single-use, MIME checked and capped at four photos', async () => {
    const foreign = await upload(b, false);
    await denied(() => m('attachPhoto', { playerId: a.playerId, storageId: foreign }), /another camper/);
    await m('attachPhoto', { playerId: b.playerId, storageId: foreign });
    await denied(() => m('attachPhoto', { playerId: b.playerId, storageId: foreign }), /expired|another camper/);
    const bad = await m('uploadUrl', { playerId: a.playerId });
    assert.equal((await fetch(bad, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: 'not an image' })).status, 415);
    await upload(b); await upload(b);
    await denied(() => m('uploadUrl', { playerId: b.playerId }), /Four photos/);
    const me = await q('me', { playerId: b.playerId });
    for (const photo of me.photos.slice(1)) await m('removePhoto', { playerId: b.playerId, storageId: photo.storageId });
  });
  await test('Peer DTOs hide DOB, socials, secret keys and permanent storage capabilities', async () => {
    const peer = (await deck(a)).cards.find(p => p.id === b.id);
    assert.ok(peer); assert.ok(!('dob' in peer)); assert.ok(!('socials' in peer)); assert.ok(!('playerId' in peer));
    assert.ok(!JSON.stringify(peer).includes(b.storageId));
    const pics = await m('photoUrls', { playerId: a.playerId, profileId: b.id });
    assert.ok(pics.photos.length); assert.ok(!JSON.stringify(pics).includes(b.storageId));
    assert.ok(pics.expiresAt > Date.now() && pics.expiresAt - Date.now() <= 5 * 60_000);
    assert.equal((await fetch(pics.photos[0].url)).status, 200);
    const ticket = new URL(pics.photos[0].url).searchParams.get('ticket');
    internal('connectDev:expirePhotoTicket', { ticket });
    assert.equal((await fetch(pics.photos[0].url)).status, 403);
  });
  await test('Visibility matches/paused excludes discovery and unauthorized photos', async () => {
    await m('saveProfile', fields(e, { visibility: 'matches' }));
    assert.ok(!(await deck(a)).cards.some(p => p.id === e.id));
    assert.equal((await m('photoUrls', { playerId: a.playerId, profileId: e.id })).photos.length, 0);
    await denied(() => swipe(a, e), /left this Trail/);
    await m('saveProfile', fields(e, { visibility: 'paused' })); assert.equal((await deck(e)).cards.length, 0);
    await m('saveProfile', fields(e));
  });
  let fire;
  await test('Only mutual Logs in the same mode match; no participant chat before match', async () => {
    assert.equal((await swipe(a, b)).matchId, null);
    assert.equal((await q('listMatches', { playerId: a.playerId })).length, 0);
    assert.equal((await swipe(b, a, 'log', 'squad')).matchId, null);
    assert.equal((await q('listMatches', { playerId: a.playerId })).length, 0);
    fire = (await swipe(b, a)).matchId; assert.ok(fire);
    local.matches.campfire = fire;
    assert.equal(await q('chat', { playerId: c.playerId, matchId: fire }), null);
    await denied(() => m('sendMessage', { playerId: c.playerId, matchId: fire, body: 'No access' }), /mutual Log/);
    assert.equal((await q('listMatches', { playerId: a.playerId }))[0].peer.socials.instagram, 'dev_camper');
    await denied(() => m('backtrack', { playerId: b.playerId, mode: 'campfire' }), /already lit a fire/);
  });
  await test('Early links, phone numbers, banned words, empty/oversize messages rejected', async () => {
    const send = body => m('sendMessage', { playerId: a.playerId, matchId: fire, body });
    for (const body of ['https://example.com', 'www.example.com', '+234 801 234 5678', 'one two three four five six seven']) await denied(() => send(body), /10 messages/);
    await denied(() => send('shit'), /Keep it kind/);
    await denied(() => send('x'.repeat(501)), /500/);
    await denied(() => send(' '), /Write a message/);
    await denied(() => m('sendMessage', { playerId: a.playerId, matchId: fire, body: '', sticker: 'bad' }), /camp sticker/);
    for (let i = 0; i < 10; i++) await send(`Hello by the fire ${i + 1}`);
    await send('https://example.com');
  });
  let bobMessage;
  await test('Eight stickers, reaction toggles, unread/read and match acknowledgments work', async () => {
    for (const sticker of ['🔥', '🪵', '🍡', '⛺', '🌙', '🎤', '🎮', '🙌']) await m('sendMessage', { playerId: b.playerId, matchId: fire, body: '', sticker });
    bobMessage = await m('sendMessage', { playerId: b.playerId, matchId: fire, body: 'Meet you at the fire' });
    assert.equal((await q('listMatches', { playerId: a.playerId }))[0].unread, true);
    await m('react', { playerId: a.playerId, messageId: bobMessage, emoji: '🔥' });
    assert.equal((await q('chat', { playerId: a.playerId, matchId: fire })).messages.at(-1).reactions[0].count, 1);
    await m('react', { playerId: a.playerId, messageId: bobMessage, emoji: '🔥' });
    assert.equal((await q('chat', { playerId: a.playerId, matchId: fire })).messages.at(-1).reactions.length, 0);
    await m('markRead', { playerId: a.playerId, matchId: fire });
    assert.equal((await q('listMatches', { playerId: a.playerId }))[0].unread, false);
    assert.equal((await q('notifications', { playerId: a.playerId })).length, 0);
  });
  let squad;
  await test('30 messages/minute/chat limit enforced on message 31; unmatch closes access', async () => {
    squad = (await swipe(a, b, 'log', 'squad')).matchId; assert.ok(squad);
    for (let i = 0; i < 30; i++) await m('sendMessage', { playerId: a.playerId, matchId: squad, body: `Rate-limit probe ${i + 1}` });
    await denied(() => m('sendMessage', { playerId: a.playerId, matchId: squad, body: 'Over quota' }), /30 messages/);
    await m('unmatch', { playerId: b.playerId, matchId: squad });
    assert.equal(await q('chat', { playerId: a.playerId, matchId: squad }), null);
    await denied(() => m('sendMessage', { playerId: a.playerId, matchId: squad, body: 'Closed' }), /mutual Log/);
  });
  await test('100 daily Logs, 3 Marshmallows and 3 Backtracks enforced at server boundaries', async () => {
    internal('connectDev:setUsage', { playerId: c.playerId, logs: 99, marshmallows: 0, backtracks: 0 });
    await swipe(c, d); assert.equal((await deck(c)).logsLeft, 0);
    await denied(() => swipe(c, e), /100 Logs/);
    internal('connectDev:setUsage', { playerId: c.playerId, logs: 0, marshmallows: 0, backtracks: 0 });
    for (const target of [a, b, d]) await swipe(c, target, 'marshmallow', 'squad');
    await denied(() => swipe(c, e, 'marshmallow', 'squad'), /3 Marshmallows/);
    assert.ok((await q('deck', { playerId: a.playerId, mode: 'squad' })).cards.find(p => p.id === c.id)?.marshmallow);
    for (const target of [a, b, e, gate]) await swipe(c, target, 'pass');
    for (let i = 0; i < 3; i++) await m('backtrack', { playerId: c.playerId, mode: 'campfire' });
    await denied(() => m('backtrack', { playerId: c.playerId, mode: 'campfire' }), /3 Backtracks/);
  });
  await rm('setRole', { playerId: head.playerId, target: gate.id, role: 'gateRanger' });
  await rm('setRole', { playerId: head.playerId, target: ranger.id, role: 'ranger' });
  let profileReport;
  await test('Non-Rangers refused all admin paths; Gate Ranger verifies but cannot moderate', async () => {
    for (const [name, args] of [['dashboard', {}], ['photos', {}], ['reports', {}], ['lookup', { campName: a.campName }]]) await denied(() => rq(name, { playerId: a.playerId, ...args }), /authorized Ranger/);
    for (const f of [a, gate]) {
      await denied(() => rm('reviewPhoto', { playerId: f.playerId, target: b.id, storageId: b.storageId, approve: false }), /authorized Ranger/);
      await denied(() => rm('pauseMessaging', { playerId: f.playerId, paused: true }), /authorized Ranger/);
      await denied(() => rm('setRole', { playerId: f.playerId, target: b.id, role: 'ranger' }), /authorized Ranger/);
      await denied(() => rm('restore', { playerId: f.playerId, target: b.id }), /authorized Ranger/);
    }
    await denied(() => rm('verify', { playerId: a.playerId, target: b.id, verified: false }), /authorized Ranger/);
    for (const name of ['photos', 'reports']) await denied(() => rq(name, { playerId: gate.playerId }), /authorized Ranger/);
    assert.equal((await rq('dashboard', { playerId: gate.playerId })).audit.length, 0);
    await rm('verify', { playerId: gate.playerId, target: b.id, verified: false });
    assert.equal((await q('me', { playerId: b.playerId })).verified, false);
    await rm('verify', { playerId: gate.playerId, target: b.id, verified: true });
    await denied(() => client.mutation(api.connect.seedHeadRanger, { playerId: a.playerId }));
    await denied(() => client.mutation(api.connectDev.prepareHead, { playerId: a.playerId }));
    profileReport = await flag(c, b);
    await denied(() => rm('resolveReport', { playerId: gate.playerId, reportId: profileReport, action: 'dismiss' }), /authorized Ranger/);
  });
  await test('Rangers only see reported chats; reports validate membership, message sender and audit access', async () => {
    await denied(() => rm('reportedChat', { playerId: head.playerId, reportId: profileReport }), /open report about this chat/);
    await denied(() => flag(c, b, { matchId: fire }), /own Tent Talk/);
    const report = await flag(a, b, { matchId: fire, messageId: bobMessage });
    await denied(() => rm('reportedChat', { playerId: gate.playerId, reportId: report }), /authorized Ranger/);
    const chat = await rm('reportedChat', { playerId: ranger.playerId, reportId: report }); assert.ok(chat.messages.length);
    await denied(() => rm('resolveReport', { playerId: ranger.playerId, reportId: report, action: 'ban' }), /authorized Ranger/);
    await rm('resolveReport', { playerId: ranger.playerId, reportId: report, action: 'warn', note: 'DEV: keep it kind by the fire' });
    assert.match((await q('me', { playerId: b.playerId })).warning, /keep it kind/);
    await denied(() => rm('reportedChat', { playerId: head.playerId, reportId: report }), /open report/);
    assert.ok((await rq('dashboard', { playerId: head.playerId })).audit.some(row => row.action === 'view-reported-chat'));
  });
  await test('Three distinct open reports auto-hide; duplicate flags do not count; review restores', async () => {
    await denied(() => flag(c, b), /already with the Rangers/);
    const r2 = await flag(a, b); const r3 = await flag(e, b);
    assert.equal((await q('me', { playerId: b.playerId })).hidden, true);
    assert.ok(!(await deck(d)).cards.some(p => p.id === b.id));
    assert.equal(await q('chat', { playerId: a.playerId, matchId: fire }), null);
    await denied(() => m('sendMessage', { playerId: b.playerId, matchId: fire, body: 'Hidden' }), /under Ranger review/);
    await rm('resolveReport', { playerId: ranger.playerId, reportId: r3, action: 'dismiss' });
    assert.equal((await q('me', { playerId: b.playerId })).hidden, false);
    for (const reportId of [profileReport, r2]) await rm('resolveReport', { playerId: ranger.playerId, reportId, action: 'dismiss' });
  });
  await test('Mute, suspend and emergency pause block messaging server-side and restore cleanly', async () => {
    let reportId = await flag(c, b);
    await rm('resolveReport', { playerId: ranger.playerId, reportId, action: 'mute' });
    await denied(() => m('sendMessage', { playerId: b.playerId, matchId: fire, body: 'Muted' }), /muted/);
    await rm('restore', { playerId: ranger.playerId, target: b.id });
    reportId = await flag(c, b);
    await rm('resolveReport', { playerId: ranger.playerId, reportId, action: 'suspend' });
    await denied(() => m('sendMessage', { playerId: b.playerId, matchId: fire, body: 'Suspended' }), /under Ranger review/);
    await rm('restore', { playerId: ranger.playerId, target: b.id });
    await rm('pauseMessaging', { playerId: head.playerId, paused: true });
    assert.equal((await q('chat', { playerId: a.playerId, matchId: fire })).messagingPaused, true);
    await denied(() => m('sendMessage', { playerId: b.playerId, matchId: fire, body: 'Paused' }), /paused messaging/);
    await rm('pauseMessaging', { playerId: head.playerId, paused: false });
    await m('sendMessage', { playerId: b.playerId, matchId: fire, body: 'Camp messaging is back' });
  });
  await test('Block hides both directions and revokes already-issued photo tickets immediately', async () => {
    const pics = await m('photoUrls', { playerId: c.playerId, profileId: e.id }); assert.ok(pics.photos.length);
    await m('block', { playerId: c.playerId, target: e.id });
    assert.ok(!(await deck(c)).cards.some(p => p.id === e.id)); assert.ok(!(await deck(e)).cards.some(p => p.id === c.id));
    assert.equal((await fetch(pics.photos[0].url)).status, 403);
    assert.equal((await m('photoUrls', { playerId: e.playerId, profileId: c.id })).photos.length, 0);
    await denied(() => swipe(e, c), /left this Trail/);
  });
  await test('Delete removes profile/storage/swipes/sent messages; bans survive delete/recreate', async () => {
    await swipe(d, c); const match = (await q('listMatches', { playerId: d.playerId })).find(row => row.peer.id === c.id); assert.ok(match);
    await m('sendMessage', { playerId: d.playerId, matchId: match.id, body: 'Disposable DEV fixture message' });
    const pics = await m('photoUrls', { playerId: c.playerId, profileId: d.id });
    const reportId = await flag(b, d); await rm('resolveReport', { playerId: head.playerId, reportId, action: 'ban' });
    await m('deleteProfile', { playerId: d.playerId });
    assert.equal(await q('me', { playerId: d.playerId }), null);
    assert.deepEqual(internal('connectDev:inspect', { profileId: d.id }), { exists: false, messages: 0, swipes: 0 });
    assert.equal((await fetch(pics.photos[0].url)).status, 403);
    await denied(() => m('saveProfile', fields(d)), /under Ranger review/);
  });
  for (const f of [gate, ranger]) { await rm('setRole', { playerId: head.playerId, target: f.id, role: null }); await m('deleteProfile', { playerId: f.playerId }); }
  for (const f of [c, e]) await m('deleteProfile', { playerId: f.playerId });
  local.campers = { Alice: a, Bob: b, Head: head };
  local.matches.campfire = fire;
  writeFileSync(fixturePath, JSON.stringify(local, null, 2), { mode: 0o600 });
  passed = true;
} catch (error) {
  // The thrown message can contain bearer IDs in RPC arguments. Keep them local, not in evidence.
  console.error(`FAIL after ${results.length} passing checks: ${String(error.data ?? error.message).replace(/[a-f0-9]{8}-[a-f0-9-]{27,}/gi, '[redacted browser key]')}${error.cause?.code ? ` (${error.cause.code})` : ''}`);
  process.exitCode = 1;
} finally {
  if (head) {
    try { await rm('pauseMessaging', { playerId: head.playerId, paused: originalPause }); } catch { console.error('Could not restore DEV messaging setting; inspect with the local operator.'); process.exitCode = 1; passed = false; }
  }
  mkdirSync(new URL('../docs/briefs/', import.meta.url), { recursive: true });
  const summary = { timestamp: new Date().toISOString(), deployment: url, passed, total: results.length, results, fixtures: 'Only Alice, Bob and Head retained for browser acceptance; private ignored local file.', note: 'Quota boundaries seeded internally on labelled fixtures; all rule checks use real public API. Photo expiry advances only the internal DEV ticket expiry, then fetches the real proxy.' };
  writeFileSync(evidencePath, JSON.stringify(summary, null, 2) + '\n');
  console.log(`${passed ? 'PASS' : 'FAIL'} ${results.length} checks against designated Convex DEV; no production writes.`);
}
