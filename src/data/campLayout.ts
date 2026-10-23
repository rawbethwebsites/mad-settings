import { TENT_COLORS, type Vec3 } from "./campWorld";
import { AVATAR_HAIR_COLORS, AVATAR_PANTS, AVATAR_SHIRTS, AVATAR_SKIN, type Gender } from "./avatar";

/**
 * Where everything and everyone sits in the campsite. Pure data, seeded so the
 * camp looks the same on every visit. ~100 campers, two to a tent.
 */

export type Pose = "walk" | "run" | "sit" | "ground" | "dance" | "sing" | "dj" | "stand";
export type Hair = "short" | "afro" | "cap" | "bun" | "bald" | "braids" | "long";

export type Look = {
  skin: string;
  shirt: string;
  pants: string;
  hair: Hair;
  hairColor?: string;
  build?: number;
  shape?: "curvy" | "slim" | "broad" | "athletic";
  top?: "tee" | "crop" | "bikini" | "tank" | "shirtless";
  bottom?: "shorts" | "trousers";
};

export type PathFn = (t: number) => { x: number; z: number; ry: number };

export type PersonSpec = {
  x: number;
  y: number;
  z: number;
  ry: number;
  look: Look;
  pose: Pose;
  phase: number;
  path?: PathFn;
  mic?: boolean;
  // A real camper: first name and the message their bubble shows
  label?: { name: string; shout: string };
};

export type TentSpec = { x: number; z: number; ry: number; color: string; scale: number };

// ── Fixed set pieces ────────────────────────────────────────────────────────
export const STAGE = { x: 10.4, z: 3.4, ry: -0.7 };
export const DJ_BOOTH = { x: -10.2, z: 5.4, ry: 0.6 };
export const PITCH = { x: 0, z: 20.5, length: 16, width: 10 };
export const FIRE_LOG_ANGLES = [150, 215, 280, 345];
export const FIRE_LOG_RADIUS = 2.75;

let seed = 20261011;
function rand() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}
const pickOne = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)];

function local(group: { x: number; z: number; ry: number }, lx: number, lz: number) {
  const c = Math.cos(group.ry);
  const s = Math.sin(group.ry);
  return { x: group.x + lx * c + lz * s, z: group.z - lx * s + lz * c };
}

/** Keeps tents and campers off the fire, path, screen, stage, DJ floor and pitch. */
function openGround(x: number, z: number, pad = 0) {
  const r = Math.hypot(x, z);
  if (r < 8 - pad || r > 18.6 + pad) return false;
  if (z > 12.5 - pad && Math.abs(x) < PITCH.length / 2 + 2.6 + pad) return false;
  if (Math.abs(x) < 3.2 + pad && z > 0) return false;
  if (Math.abs(x) < 6.5 + pad && z < -4.5) return false;
  if (Math.hypot(x - 9.6, z - 4.3) < 4.6 + pad) return false;
  if (Math.hypot(x + 9.0, z - 7.0) < 4.8 + pad) return false;
  return true;
}

export function treeAllowed(x: number, z: number) {
  return !(Math.abs(x - PITCH.x) < PITCH.length / 2 + 2.2 && Math.abs(z - PITCH.z) < PITCH.width / 2 + 2.6);
}

// ── Looks ───────────────────────────────────────────────────────────────────
export const SKIN = ["#4a2c1c", "#5c3722", "#6e4129", "#7d4c30", "#8f5a3a", "#3f2618", "#a46b45"];
const SHIRTS = ["#6D28D9", "#BEF264", "#FB7185", "#22D3EE", "#FDFBF7", "#F59E0B", "#2b2b3a", "#3b6e8f", "#8a2a3a", "#e9e4d8", "#1f7a5a"];
const PANTS = ["#1d1d2a", "#2a3a5a", "#22222e", "#3a3226", "#4a4a52", "#1b2b44", "#d8cdb8"];
const HAIRS: Hair[] = ["short", "short", "afro", "braids", "cap", "bun", "bald", "long", "braids", "long"];
// Mostly dark hair, with the odd anime colour
const HAIR_TONES = ["#1a1420", "#1a1420", "#1a1420", "#2a1a12", "#5a3825", "#5a3825", "#8b5cf6", "#f29cc2", "#4c7bd9", "#e8c46a"];
const CAP_COLORS = ["#6D28D9", "#0A0A0A", "#FB7185", "#22D3EE", "#BEF264"];

function randomLook(): Look {
  const hair = pickOne(HAIRS);
  return {
    skin: pickOne(SKIN),
    shirt: pickOne(SHIRTS),
    pants: pickOne(PANTS),
    hair,
    hairColor: hair === "cap" ? pickOne(CAP_COLORS) : pickOne(HAIR_TONES),
    build: 0.9 + rand() * 0.18,
    ...(hair === "long" || hair === "braids" || hair === "bun" || (hair === "afro" && rand() < 0.5)
      ? pickOne([
          { shape: "curvy", top: "crop", bottom: "shorts" },
          { shape: "curvy", top: "tee", bottom: "trousers" },
          { shape: "slim", top: "tee", bottom: "shorts" },
          { shape: "slim", top: "crop", bottom: "trousers" },
        ] as const)
      : pickOne([
          { shape: "broad", top: "tank", bottom: "shorts" },
          { shape: "broad", top: "tee", bottom: "trousers" },
          { shape: "athletic", top: "tee", bottom: "trousers" },
          { shape: "athletic", top: "tank", bottom: "trousers" },
        ] as const)),
  };
}

// ── Tents: three staggered rings, doors facing the fire ─────────────────────
function buildTents(): TentSpec[] {
  const rings = [
    { r: 9.3, spacing: 2.7, offset: 0.1 },
    { r: 12.1, spacing: 2.75, offset: 0.24 },
    { r: 14.9, spacing: 2.8, offset: 0.05 },
    { r: 17.6, spacing: 2.85, offset: 0.18 },
  ];
  const byRing: TentSpec[][] = [];
  rings.forEach((ring, ri) => {
    const tents: TentSpec[] = [];
    byRing.push(tents);
    const n = Math.floor((Math.PI * 2 * ring.r) / ring.spacing);
    for (let i = 0; i < n; i += 1) {
      const a = ring.offset + (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.04;
      const r = ring.r + (rand() - 0.5) * 0.35;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (!openGround(x, z, 1.1)) continue;
      tents.push({
        x,
        z,
        ry: Math.atan2(-x, -z) + (rand() - 0.5) * 0.18,
        color: TENT_COLORS[(i + ri * 2) % TENT_COLORS.length],
        scale: 0.8 + rand() * 0.08,
      });
    }
  });
  // Thin the outer ring evenly so it stays balanced at 50 tents.
  const inner = byRing.slice(0, -1).flat();
  const outer = byRing[byRing.length - 1];
  const keep = Math.max(0, Math.min(outer.length, 50 - inner.length));
  return [...inner, ...Array.from({ length: keep }, (_, i) => outer[Math.floor((i * outer.length) / keep)])];
}

export const TENTS = buildTents();

// ── People ──────────────────────────────────────────────────────────────────
function buildPeople(): PersonSpec[] {
  const people: PersonSpec[] = [];
  const add = (p: Omit<PersonSpec, "y" | "phase"> & { y?: number; phase?: number }) =>
    people.push({ y: 0, phase: rand() * 10, ...p });

  // Friends on the logs round the fire.
  const fireLooks: Look[] = [
    { skin: SKIN[0], shirt: "#6D28D9", pants: "#1d1d2a", hair: "afro" },
    { skin: SKIN[3], shirt: "#FDFBF7", pants: "#2a3a5a", hair: "braids", build: 0.92 },
    { skin: SKIN[1], shirt: "#BEF264", pants: "#22222e", hair: "cap", hairColor: "#0A0A0A" },
    { skin: SKIN[5], shirt: "#FB7185", pants: "#1d1d2a", hair: "short", build: 0.94 },
    { skin: SKIN[4], shirt: "#22D3EE", pants: "#3a3226", hair: "short", build: 1.08 },
    { skin: SKIN[2], shirt: "#2b2b3a", pants: "#2a3a5a", hair: "afro", build: 0.92 },
    { skin: SKIN[6], shirt: "#F59E0B", pants: "#1d1d2a", hair: "bald", build: 1.05 },
  ];
  let f = 0;
  FIRE_LOG_ANGLES.forEach((deg, li) => {
    for (const offset of li === 2 ? [-0.42] : [-0.42, 0.42]) {
      const a = (deg * Math.PI) / 180;
      const x = Math.cos(a) * FIRE_LOG_RADIUS - Math.sin(a) * offset + Math.cos(a) * 0.12;
      const z = Math.sin(a) * FIRE_LOG_RADIUS + Math.cos(a) * offset + Math.sin(a) * 0.12;
      add({ x, y: 0.02, z, ry: Math.atan2(-x, -z), look: fireLooks[f], pose: "sit", phase: f * 2.3 });
      f += 1;
    }
  });

  // Pairs strolling laps between the fire and the tents.
  const laps = [
    { r: 5.2, start: 0, dir: 1, speed: 0.16 },
    { r: 5.85, start: 0.02, dir: 1, speed: 0.16 },
    { r: 5.5, start: Math.PI, dir: 1, speed: 0.15 },
    { r: 5.5, start: Math.PI + 2.1, dir: 1, speed: 0.17 },
    { r: 6.75, start: 0.8, dir: 1, speed: 0.12 },
    { r: 6.75, start: 0.86, dir: 1, speed: 0.12 },
    { r: 7.15, start: 2.6, dir: -1, speed: 0.11 },
    { r: 7.15, start: 2.66, dir: -1, speed: 0.11 },
    { r: 6.75, start: 4.4, dir: 1, speed: 0.13 },
    { r: 7.15, start: 5.2, dir: -1, speed: 0.12 },
    { r: 7.15, start: 5.26, dir: -1, speed: 0.12 },
  ];
  laps.forEach((lap) => {
    const path: PathFn = (time) => {
      const a = lap.start + time * lap.speed * lap.dir;
      return { x: Math.cos(a) * lap.r, z: Math.sin(a) * lap.r, ry: lap.dir > 0 ? -a : -a + Math.PI };
    };
    add({ x: 0, z: 0, ry: 0, look: randomLook(), pose: "walk", path });
  });

  // Movie night: rows on the grass facing the screen.
  const rows = [
    { z: -8.3, xs: [-2.4, -1.2, 0, 1.2, 2.4] },
    { z: -9.4, xs: [-1.8, -0.6, 0.6, 1.8] },
    { z: -10.4, xs: [-1.2, 0, 1.2] },
  ];
  rows.forEach((row) =>
    row.xs.forEach((x) =>
      add({ x: x + (rand() - 0.5) * 0.25, z: row.z + (rand() - 0.5) * 0.2, ry: Math.PI + x * 0.03, look: randomLook(), pose: "ground" }),
    ),
  );

  // Karaoke: singer, two hype dancers on stage, a crowd at the front.
  const onStage = (lx: number, ly: number, lz: number, lry: number, look: Look, pose: Pose, mic = false) => {
    const p = local(STAGE, lx, lz);
    add({ x: p.x, y: ly, z: p.z, ry: lry + STAGE.ry, look, pose, mic });
  };
  onStage(0.55, 0.24, 0.35, 0, { skin: SKIN[3], shirt: "#BEF264", pants: "#1d1d2a", hair: "braids", build: 0.92 }, "sing", true);
  onStage(-1.15, 0.24, -0.75, 0.25, { skin: SKIN[5], shirt: "#22D3EE", pants: "#1d1d2a", hair: "afro" }, "dance");
  onStage(1.6, 0.24, -0.95, -0.3, { skin: SKIN[2], shirt: "#FB7185", pants: "#2a3a5a", hair: "cap", hairColor: "#6D28D9", build: 1.05 }, "dance");
  [
    [-2.1, 1.6],
    [-1.0, 2.1],
    [0.2, 2.3],
    [1.4, 2.0],
    [2.5, 1.4],
    [-1.6, 3.1],
    [-0.3, 3.3],
    [1.0, 3.2],
  ].forEach(([lx, lz]) => onStage(lx, 0, lz, Math.atan2(0.55 - lx, 0.35 - lz), randomLook(), "dance"));

  // DJ and the dance floor in front of the booth.
  const atBooth = (lx: number, lz: number, lry: number, look: Look, pose: Pose) => {
    const p = local(DJ_BOOTH, lx, lz);
    add({ x: p.x, z: p.z, ry: lry + DJ_BOOTH.ry, look, pose });
  };
  atBooth(0, -0.85, 0, { skin: SKIN[1], shirt: "#0A0A0A", pants: "#1d1d2a", hair: "cap", hairColor: "#6D28D9", build: 1.06 }, "dj");
  for (let i = 0; i < 10; i += 1) {
    const lx = -2 + (i % 4) * 1.3 + (rand() - 0.5) * 0.4;
    const lz = 1.7 + Math.floor(i / 4) * 1.1 + (rand() - 0.5) * 0.3;
    atBooth(lx, lz, Math.atan2(-lx, -0.85 - lz), randomLook(), "dance");
  }

  // Morning five-a-side.
  const kits = [
    { shirt: "#BEF264", pants: "#FDFBF7" },
    { shirt: "#BEF264", pants: "#FDFBF7" },
    { shirt: "#6D28D9", pants: "#0A0A0A" },
    { shirt: "#6D28D9", pants: "#0A0A0A" },
  ];
  [
    { lag: 0.35, ox: 0.6, oz: 0.3 },
    { lag: 0.8, ox: -0.9, oz: 0.8 },
    { lag: 0.5, ox: 0.4, oz: -1.0 },
    { lag: 1.4, ox: -1.8, oz: -0.6 },
  ].forEach((pl, i) => {
    const at = (s: number) => {
      const b = ballAt(s - pl.lag);
      return { x: PITCH.x + b.x + pl.ox, z: PITCH.z + b.z + pl.oz };
    };
    const path: PathFn = (time) => {
      const now = at(time);
      const next = at(time + 0.05);
      return { x: now.x, z: now.z, ry: Math.atan2(next.x - now.x, next.z - now.z) };
    };
    add({ x: 0, z: 0, ry: 0, look: { ...randomLook(), ...kits[i], hair: i === 1 ? "bald" : pickOne(["short", "afro", "cap"] as const) }, pose: "run", path, phase: i * 0.4 });
  });

  // Everyone else hangs out at their tent door, two to a tent.
  const room = 100 - people.length;
  const pairs = Math.floor(room / 2);
  for (let k = 0; k < pairs && k < TENTS.length; k += 1) {
    const tent = TENTS[Math.floor((k * TENTS.length) / pairs)];
    const len = Math.hypot(tent.x, tent.z);
    const dx = -tent.x / len;
    const dz = -tent.z / len;
    const px = -dz;
    const pz = dx;
    const sitting = k % 3 === 1;
    const front = sitting ? 1.35 : 1.55;
    for (const side of [-1, 1]) {
      const x = tent.x + dx * front + px * side * 0.42;
      const z = tent.z + dz * front + pz * side * 0.42;
      // face the friend, turned a little toward the camp
      const fx = -px * side * 0.8 + dx * 0.55;
      const fz = -pz * side * 0.8 + dz * 0.55;
      add({ x, z, ry: Math.atan2(fx, fz), look: randomLook(), pose: sitting ? "ground" : "stand" });
    }
  }
  return people;
}

/** The match ball, in pitch-local coordinates. */
export function ballAt(t: number) {
  return { x: Math.sin(t * 0.45) * 5.2 + Math.sin(t * 1.3) * 0.6, z: Math.sin(t * 0.33) * 3 };
}

export const PEOPLE = buildPeople();

// ── Real campers ────────────────────────────────────────────────────────────
export type CamperOnSite = { id: string; name: string; gender: Gender; look: { skin: number; hair: string; shirt: number; pants: number; hairColor?: number; shape?: string; top?: string; bottom?: string }; shout: string };

// Paid campers take over the strollers first, then the people hanging out by the tents
const CAMPER_SLOTS = (["walk", "stand", "ground"] as const).flatMap((pose) =>
  PEOPLE.map((p, i) => (p.pose === pose && !(pose === "ground" && p.z < -7) ? i : -1)).filter((i) => i >= 0),
);

// A camper's saved choices as a 3D look
export function camperLook(c: Pick<CamperOnSite, "gender" | "look">): Look {
  const hair = c.look.hair as Hair;
  return {
    skin: AVATAR_SKIN[c.look.skin] ?? AVATAR_SKIN[0],
    shirt: AVATAR_SHIRTS[c.look.shirt] ?? AVATAR_SHIRTS[0],
    pants: AVATAR_PANTS[c.look.pants] ?? AVATAR_PANTS[0],
    hair,
    hairColor: hair === "cap" ? "#6D28D9" : AVATAR_HAIR_COLORS[c.look.hairColor ?? 0] ?? AVATAR_HAIR_COLORS[0],
    build: c.gender === "female" ? 0.92 : 1.04,
    shape: (c.look.shape as Look["shape"]) ?? (c.gender === "female" ? "slim" : "athletic"),
    top: (c.look.top as Look["top"]) ?? "tee",
    bottom: (c.look.bottom as Look["bottom"]) ?? "trousers",
  };
}

export function withCampers(campers: CamperOnSite[]): PersonSpec[] {
  if (!campers.length) return PEOPLE;
  const people = PEOPLE.slice();
  campers.slice(0, CAMPER_SLOTS.length).forEach((c, k) => {
    const i = CAMPER_SLOTS[k];
    people[i] = { ...people[i], look: camperLook(c), label: { name: c.name, shout: c.shout } };
  });
  return people;
}

export type { Vec3 };
