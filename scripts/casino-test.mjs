// End-to-end check of casino chips on the DEV deployment: founder bonus, buying chips, staking,
// pot payout with the house cut, refunds, forfeits, the pause switch and the staff report.
// Run: NODE_OPTIONS=--dns-result-order=ipv4first node --env-file=.env.local scripts/casino-test.mjs
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { ConvexHttpClient } from '../node_modules/convex/dist/esm/browser/index.js';
import { api } from '../convex/_generated/api.js';

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
assert.equal(url, 'https://joyous-pelican-468.convex.cloud', 'Tests refuse non-designated-DEV deployments');
assert.ok(process.env.CONVEX_DEPLOYMENT?.startsWith('dev:'), 'DEV configuration required');
const client = new ConvexHttpClient(url, { logger: false });
const run = randomUUID().slice(0, 4);
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6VqQAAAAASUVORK5CYII=', 'base64');
let passed = 0;
const ok = (label) => { passed++; console.log(`✓ ${label}`); };

function internal(name, args) {
  const out = execFileSync('npx', ['convex', 'run', name, JSON.stringify(args)], { cwd: new URL('..', import.meta.url), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return out.trim() ? JSON.parse(out.trim()) : null;
}
async function rejects(fn, message) {
  let caught;
  try { await fn(); } catch (e) { caught = e; }
  assert.ok(caught, 'Expected the server to reject this');
  if (message) assert.match(String(caught.data ?? caught.message), message);
}
const phone = () => `0909${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;

// Staff: a clearly labelled DEV Head Ranger
const head = { playerId: randomUUID() };
await client.mutation(api.connect.saveProfile, { playerId: head.playerId, campName: `DEV Casino Head ${run}`, dob: '1990-01-01', modes: ['squad'], prompts: [], tags: [], socials: {}, visibility: 'paused' });
internal('connectDev:prepareHead', { playerId: head.playerId });

async function payReceipt(key, kind, amount) {
  const uploadUrl = await client.mutation(api.accounts.proofUploadUrl, { playerKey: key });
  const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: png });
  const { storageId } = await res.json();
  await client.mutation(api.accounts.submitPayment, { playerKey: key, kind, amount, proof: storageId });
  const { pending } = await client.query(api.walletAdmin.overview, { playerId: head.playerId });
  const p = pending.find(x => x.kind === kind && x.camper?.phone && x.amount === amount && x.camper.name.endsWith(run));
  await client.mutation(api.walletAdmin.review, { playerId: head.playerId, paymentId: p.id, approve: true });
}

async function camper(label) {
  const before = await client.query(api.casino.lobby, { playerKey: '' });
  const r = await client.action(api.accounts.register, { name: `DEV ${label} ${run}`, phone: phone(), password: 'devpass123', playerKey: randomUUID() });
  await payReceipt(r.playerKey, 'registration', 10_000);
  const lobby = await client.query(api.casino.lobby, { playerKey: r.playerKey });
  if (before.foundersLeft > 0) {
    assert.equal(lobby.me.founderNo, 100 - before.foundersLeft + 1);
    assert.equal(lobby.me.chips, 2_000);
  }
  return { key: r.playerKey, name: `DEV ${label} ${run}`, founder: before.foundersLeft > 0 };
}

const chips = async (c) => (await client.query(api.casino.lobby, { playerKey: c.key })).me.chips;
const wallet = async (c) => (await client.query(api.casino.lobby, { playerKey: c.key })).me.balance;

const alice = await camper('Ada');
const bob = await camper('Bayo');
ok('Founding Campers get a number and 2,000 chips when their fee is approved');

// Buying chips
await payReceipt(alice.key, 'topup', 5_000);
await payReceipt(bob.key, 'topup', 5_000);
await rejects(() => client.mutation(api.casino.buyChips, { playerKey: alice.key, naira: 5_000 }), /18 or older/);
for (const c of [alice, bob]) await client.mutation(api.casino.confirmAdult, { playerKey: c.key });
const start = await chips(alice);
await client.mutation(api.casino.buyChips, { playerKey: alice.key, naira: 5_000 });
await client.mutation(api.casino.buyChips, { playerKey: bob.key, naira: 5_000 });
assert.equal(await chips(alice), start + 5_500);
assert.equal(await wallet(alice), 0);
await rejects(() => client.mutation(api.casino.buyChips, { playerKey: alice.key, naira: 1_000 }), /Not enough in your wallet/);
await rejects(() => client.mutation(api.casino.buyChips, { playerKey: alice.key, naira: 1_234 }), /chip packs/);
ok('₦5,000 buys 5,500 chips from the wallet; 18+ check, empty wallet and odd amounts are refused');

// A room with both campers
const { code } = await client.mutation(api.rooms.create, { playerId: alice.key, name: "Ada", avatar: "🦁" });
await client.mutation(api.rooms.join, { playerId: bob.key, name: 'Bayo', avatar: '🐯', code });
const room = await client.query(api.rooms.get, { code, playerId: alice.key });
const bobRow = room.players.find(p => p.name === 'Bayo').id;

async function chipGame(stake) {
  const id = await client.mutation(api.matches.create, { code, playerId: alice.key, game: 'connect4', invite: [bobRow], stake });
  await client.mutation(api.matches.join, { matchId: id, playerId: bob.key });
  return id;
}

// Win: Ada drops four in column 0
const a0 = await chips(alice), b0 = await chips(bob);
const m1 = await chipGame(1_000);
assert.equal(await chips(alice), a0 - 1_000);
assert.equal(await chips(bob), b0 - 1_000);
let view = await client.query(api.matches.get, { matchId: m1, playerId: bob.key });
assert.equal(view.pot, 2_000);
assert.equal(view.stake, 1_000);
for (let i = 0; i < 4; i++) {
  await client.mutation(api.matches.act, { matchId: m1, playerId: alice.key, action: { col: 0 } });
  if (i < 3) await client.mutation(api.matches.act, { matchId: m1, playerId: bob.key, action: { col: 1 } });
}
view = await client.query(api.matches.get, { matchId: m1, playerId: alice.key });
assert.equal(view.status, 'finished');
assert.equal(view.won, 1_900);
assert.equal(await chips(alice), a0 + 900);
assert.equal(await chips(bob), b0 - 1_000);
await rejects(() => client.mutation(api.matches.rematch, { matchId: m1, playerId: alice.key }), /new game/);
ok('Connect 4 for 1,000 each: pot 2,000, house keeps 100, winner gets 1,900; no auto-rematch');

// Called off before it starts: stakes come back in full
const a1 = await chips(alice);
const m2 = await client.mutation(api.matches.create, { code, playerId: alice.key, game: 'connect4', invite: [bobRow], stake: 500 });
assert.equal(await chips(alice), a1 - 500);
await client.mutation(api.matches.cancel, { matchId: m2, playerId: alice.key });
assert.equal(await chips(alice), a1);
ok('A cancelled chip game refunds the stake');

// Give up: the other camper takes the pot
const a2 = await chips(alice), b2 = await chips(bob);
const m3 = await chipGame(200);
await client.mutation(api.matches.resign, { matchId: m3, playerId: alice.key });
assert.equal(await chips(bob), b2 + 180);
assert.equal(await chips(alice), a2 - 200);
ok('Giving up hands the pot (minus 5%) to the other player');

// Not enough chips, odd stakes, and the pause switch
await rejects(() => client.mutation(api.matches.create, { code, playerId: alice.key, game: 'connect4', invite: [bobRow], stake: 300 }), /chip stakes/);
await client.mutation(api.casino.setCasino, { playerId: head.playerId, paused: true });
await rejects(() => chipGame(100), /paused/);
await client.mutation(api.casino.setCasino, { playerId: head.playerId, paused: false });
await rejects(() => client.mutation(api.casino.setCasino, { playerId: bob.key, paused: true }), /Head Ranger/);
ok('Odd stakes refused; Head Ranger can pause chip games, campers cannot');

// Free games still work as before
const free = await client.mutation(api.matches.create, { code, playerId: alice.key, game: 'connect4', invite: [bobRow] });
await client.mutation(api.matches.join, { matchId: free, playerId: bob.key });
view = await client.query(api.matches.get, { matchId: free, playerId: alice.key });
assert.equal(view.stake, 0);
await client.mutation(api.matches.resign, { matchId: free, playerId: alice.key });
ok('Free games are unchanged');

// Camp Chess for chips
async function chessInvite(stake) {
  await client.mutation(api.chess.ping, { playerId: alice.key, name: 'Ada', avatar: '🦁', busy: false });
  await client.mutation(api.chess.ping, { playerId: bob.key, name: 'Bayo', avatar: '🐯', busy: false });
  const toId = (await client.query(api.chess.online, { playerId: alice.key })).find(p => p.name === 'Bayo').id;
  const { inviteId, code } = await client.mutation(api.chess.invite, { playerId: alice.key, name: 'Ada', avatar: '🦁', toId, side: 'w', stake });
  return { inviteId, code };
}
const ca = await chips(alice), cb = await chips(bob);
let inv = await chessInvite(1_000);
assert.equal(await chips(alice), ca - 1_000);
assert.equal((await client.query(api.chess.incoming, { playerId: bob.key }))[0].stake, 1_000);
await client.mutation(api.chess.accept, { inviteId: inv.inviteId, playerId: bob.key, name: 'Bayo', avatar: '🐯' });
assert.equal(await chips(bob), cb - 1_000);
for (const [who, from, to] of [[alice, 'f2', 'f3'], [bob, 'e7', 'e5'], [alice, 'g2', 'g4'], [bob, 'd8', 'h4']]) {
  await client.mutation(api.chess.move, { code: inv.code, playerId: who.key, from, to });
}
const cg = await client.query(api.chess.get, { code: inv.code, playerId: bob.key });
assert.equal(cg.status, 'finished');
assert.equal(cg.won, 1_900);
assert.equal(await chips(bob), cb + 900);
assert.equal(await chips(alice), ca - 1_000);
await rejects(() => client.mutation(api.chess.rematch, { code: inv.code, playerId: alice.key }), /lobby/);
ok('Chess for 1,000 each: checkmate pays the winner 1,900; no auto-rematch');

const cc = await chips(alice);
inv = await chessInvite(500);
await client.mutation(api.chess.decline, { inviteId: inv.inviteId, playerId: bob.key });
assert.equal(await chips(alice), cc);
inv = await chessInvite(500);
await client.mutation(api.chess.cancel, { inviteId: inv.inviteId, playerId: alice.key });
assert.equal(await chips(alice), cc);
inv = await chessInvite(500);
internal('chess:expireInvite', { inviteId: inv.inviteId });
assert.equal(await chips(alice), cc);
inv = await chessInvite(500);
await chessInvite(200); // a newer invite replaces the old one
assert.equal(await chips(alice), cc - 200);
ok('Chess stakes come back when an invite is declined, cancelled, expires or is replaced');

const cd = await chips(alice), ce = await chips(bob);
inv = await client.query(api.chess.outgoing, { playerId: alice.key });
await client.mutation(api.chess.accept, { inviteId: inv.id, playerId: bob.key, name: 'Bayo', avatar: '🐯' });
await client.mutation(api.chess.resign, { code: inv.code, playerId: bob.key });
assert.equal(await chips(alice), cd + 380);
assert.equal(await chips(bob), ce - 200);
ok('Resigning a chess chip game hands the pot (minus 5%) to the other player');

const report = await client.query(api.casino.report, { playerId: head.playerId });
assert.ok(report.nairaSold >= 10_000 && report.houseKept >= 240);
const lobby = await client.query(api.casino.lobby, { playerKey: alice.key });
assert.ok(lobby.leaderboard.some(r => r.me));
ok(`Staff report and leaderboard (sold ₦${report.nairaSold.toLocaleString()}, house kept ${report.houseKept} chips)`);

await client.mutation(api.connect.deleteProfile, { playerId: head.playerId });
console.log(`\n${passed} checks passed`);
