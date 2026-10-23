// Fill the DEV Trail with test campers so matching can be tried by hand.
// Run: NODE_OPTIONS=--dns-result-order=ipv4first node --env-file=.env.local scripts/connect-seed.mjs <command>
//   seed [count]   make `count` (default 50) campers labelled "DEV", each with an approved photo
//   like           half the seeded campers Like every real (non-DEV) camper, so a right swipe on them matches
//   watch [mins]   repeat `like` every 15 seconds for `mins` minutes (default 60) to catch new sign-ups
//   clean          delete every seeded camper
// Refuses any deployment except the designated DEV one. Player ids are kept in a local, untracked file.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { ConvexHttpClient } from '../node_modules/convex/dist/esm/browser/index.js';
import { api } from '../convex/_generated/api.js';

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
assert.equal(url, 'https://joyous-pelican-468.convex.cloud', 'Seeding refuses non-designated-DEV deployments');
assert.ok(process.env.CONVEX_DEPLOYMENT?.startsWith('dev:'), 'DEV configuration required');
const client = new ConvexHttpClient(url, { logger: false });
const m = (name, args) => client.mutation(api.connect[name], args);
const q = (name, args) => client.query(api.connect[name], args);
const rm = (name, args) => client.mutation(api.connectRangers[name], args);
const savePath = new URL('../docs/briefs/.connect-seed.local.json', import.meta.url);

const NAMES = ['Tolu', 'Chidi', 'Amaka', 'Seyi', 'Ngozi', 'Kemi', 'Emeka', 'Ada', 'Bisi', 'Femi', 'Zainab', 'Ifeanyi', 'Yemi', 'Funke', 'Uche', 'Halima', 'Dayo', 'Nneka', 'Tunde', 'Ebuka', 'Simi', 'Obinna', 'Lola', 'Kunle', 'Chioma'];
const ANSWERS = [
  ['Making anyone laugh in 5 minutes', 'Starting the dance circle', 'Finding the aux cable first'],
  ['Essence by Wizkid, no contest', 'Anything by Asa', 'Ye, every single time'],
  ['Know the words to old Naija jams', 'Never say no to suya at midnight', 'Can beat me at Whot'],
  ['Puff-puff, hot', 'Roasted corn and ube', 'Chin chin by the handful'],
  ['Carrying the cooler', 'Hype on the sideline', 'Remembering everyone’s order'],
  ['Whot', 'Ludo', 'Chess, if you dare'],
  ['The night the generator died mid-match', 'How I got lost in Lekki', 'My first owambe'],
  ['By the fire, still talking', 'Already on a morning run', 'Asleep, sorry'],
];
const TAGS = ['Karaoke', 'Football', 'Whot shark', 'Night owl', 'Chess brain', 'Dancer', 'Foodie', 'DJ head', 'Storyteller', 'Early riser'];
const COLORS = [['#f97316', '#7c2d12'], ['#a855f7', '#3b0764'], ['#22c55e', '#14532d'], ['#3b82f6', '#1e3a8a'], ['#ec4899', '#831843'], ['#eab308', '#713f12']];

const pick = (list, i) => list[i % list.length];
const sample = (list, n, seed) => [...list].sort((a, b) => ((a.length * 7 + seed) % 5) - ((b.length * 3 + seed) % 5)).slice(0, n);
const load = () => (existsSync(savePath) ? JSON.parse(readFileSync(savePath, 'utf8')) : { campers: [] });
const save = data => writeFileSync(savePath, JSON.stringify(data, null, 2), { mode: 0o600 });

function internal(name, args) {
  const out = execFileSync('npx', ['convex', 'run', name, JSON.stringify(args)], { cwd: new URL('..', import.meta.url), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return out.trim() ? JSON.parse(out.trim()) : null;
}

// A plain coloured badge with initials, clearly marked as a test photo.
function avatar(name, i) {
  const [a, b] = pick(COLORS, i);
  const initials = name.split(' ')[1].slice(0, 2).toUpperCase();
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <rect width="600" height="800" fill="url(#g)"/>
    <text x="300" y="440" font-family="Helvetica, Arial" font-size="220" font-weight="900" fill="#fff" text-anchor="middle">${initials}</text>
    <text x="300" y="740" font-family="Helvetica, Arial" font-size="40" font-weight="700" fill="#ffffffaa" text-anchor="middle">TEST CAMPER</text>
  </svg>`)).jpeg({ quality: 80 }).toBuffer();
}

async function upload(playerId, image) {
  const uploadUrl = await m('uploadUrl', { playerId });
  const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: image });
  assert.equal(res.status, 200, 'DEV photo upload');
  const { storageId } = await res.json();
  await m('attachPhoto', { playerId, storageId });
  return storageId;
}

async function seed(count) {
  const data = load();
  const run = randomUUID().slice(0, 4);
  if (!data.head) {
    const head = { playerId: randomUUID(), campName: `DEV Seed Ranger ${run}` };
    head.id = await m('saveProfile', { playerId: head.playerId, campName: head.campName, dob: '1990-01-01', modes: ['squad'], prompts: [], tags: [], socials: {}, visibility: 'paused' });
    try { internal('connect:seedHeadRanger', { playerId: head.playerId }); }
    catch { internal('connectDev:prepareHead', { playerId: head.playerId }); }
    data.head = head;
    save(data);
  }
  for (let i = 0; i < count; i++) {
    const n = data.campers.length;
    const campName = `DEV ${pick(NAMES, n)} ${run}${n}`.slice(0, 24);
    const modes = n % 3 === 0 ? ['campfire', 'squad'] : n % 3 === 1 ? ['campfire'] : ['squad'];
    const age = 19 + (n * 7) % 17;
    const dob = `${new Date().getUTCFullYear() - age - 1}-${String(1 + (n % 12)).padStart(2, '0')}-${String(1 + (n % 27)).padStart(2, '0')}`;
    const qs = [n % 8, (n + 3) % 8];
    const f = { playerId: randomUUID(), campName, likes: n % 2 === 0 };
    f.id = await m('saveProfile', {
      playerId: f.playerId, campName, dob, modes,
      prompts: qs.map(question => ({ question, answer: pick(ANSWERS[question], n) })),
      tags: sample(TAGS, 2 + (n % 3), n), socials: {}, visibility: 'everyone',
    });
    const storageId = await upload(f.playerId, await avatar(campName, n));
    await rm('reviewPhoto', { playerId: data.head.playerId, target: f.id, storageId, approve: true });
    data.campers.push(f);
    save(data);
    console.log(`made ${n + 1}: ${campName} · ${modes.join(' + ')} · ${f.likes ? 'will Like testers' : 'waits for you'}`);
  }
}

async function like() {
  const { campers } = load();
  let made = 0;
  for (const f of campers.filter(c => c.likes)) {
    const me = await q('me', { playerId: f.playerId });
    for (const mode of me?.modes ?? []) {
      const { cards } = await q('deck', { playerId: f.playerId, mode });
      for (const card of cards.filter(c => !c.campName.startsWith('DEV '))) {
        try { await m('swipe', { playerId: f.playerId, target: card.id, mode, kind: 'log' }); made++; }
        catch (e) { console.log(`skip ${f.campName} → ${card.campName}: ${e.data ?? e.message}`); }
      }
    }
  }
  return made;
}

async function clean() {
  const data = load();
  for (const f of [...data.campers, ...(data.head ? [data.head] : [])]) {
    try { await m('deleteProfile', { playerId: f.playerId }); console.log(`deleted ${f.campName}`); }
    catch (e) { console.log(`could not delete ${f.campName}: ${e.data ?? e.message}`); }
  }
  save({ campers: [] });
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'seed') await seed(Number(arg) || 50);
else if (cmd === 'like') console.log(`Likes sent: ${await like()}`);
else if (cmd === 'watch') {
  const until = Date.now() + (Number(arg) || 60) * 60_000;
  while (Date.now() < until) {
    const n = await like();
    if (n) console.log(`${new Date().toLocaleTimeString()} Likes sent: ${n}`);
    await new Promise(r => setTimeout(r, 15_000));
  }
} else if (cmd === 'clean') await clean();
else console.log('Commands: seed [count] | like | watch [mins] | clean');
