export type Vec3 = [number, number, number];

export type CampKeyframe = {
  t: number;
  pos: Vec3;
  look: Vec3;
  sky: string;
  fire: number;
};

/** Scroll-driven camera path through the MAD SETTINGS campsite. */
export const CAMERA_KEYS: CampKeyframe[] = [
  { t: 0.0, pos: [0, 5.6, 26], look: [0, 1.3, 4], sky: "#8ec5ea", fire: 0.12 },
  { t: 0.08, pos: [3.2, 3.3, 14], look: [0, 1.15, 2], sky: "#b9c9d8", fire: 0.22 },
  { t: 0.16, pos: [0.2, 2.7, 9.2], look: [0, 1.2, 0], sky: "#d9805e", fire: 0.42 },
  { t: 0.26, pos: [9.2, 4.3, 6.4], look: [0, 1.05, 0], sky: "#171233", fire: 0.52 },
  { t: 0.38, pos: [0, 2.5, -1.8], look: [0, 2.15, -11], sky: "#120f26", fire: 0.34 },
  { t: 0.48, pos: [9.6, 2.9, 6.1], look: [10.2, 1.45, 3.4], sky: "#1e1434", fire: 0.58 },
  { t: 0.58, pos: [2.5, 1.75, 4.3], look: [0, 1.15, 0], sky: "#28160f", fire: 1 },
  { t: 0.7, pos: [0, 3.5, 8.2], look: [0, 1.05, 0], sky: "#1a1430", fire: 0.42 },
  { t: 0.8, pos: [-2, 7.2, 16], look: [0, 0.9, 6], sky: "#e39a86", fire: 0.16 },
  { t: 0.9, pos: [8.2, 5.6, 24], look: [0, 0.25, 20], sky: "#7eb3d6", fire: 0.08 },
  { t: 1, pos: [0, 16.5, 28], look: [0, 0.2, 0], sky: "#87b4d4", fire: 0.05 },
];

export const NIGHT_STAGES = [
  { id: "arrival", label: "ARRIVE", href: "#arrival" },
  { id: "games", label: "PLAY", href: "#games" },
  { id: "movie", label: "MOVIE", href: "#movie" },
  { id: "karaoke", label: "MIC", href: "#karaoke" },
  { id: "bonfire", label: "FIRE", href: "#bonfire" },
  { id: "morning", label: "DAWN", href: "#morning" },
  { id: "football", label: "PITCH", href: "#football" },
  { id: "departure", label: "WRAP", href: "#departure" },
] as const;

export const TENT_COLORS = ["#6D28D9", "#BEF264", "#FB7185", "#22D3EE"] as const;

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export function sampleCamp(t: number) {
  const x = clamp01(t);
  let i = 0;
  while (i < CAMERA_KEYS.length - 2 && CAMERA_KEYS[i + 1].t < x) i += 1;
  const a = CAMERA_KEYS[i];
  const b = CAMERA_KEYS[i + 1];
  const u = (x - a.t) / Math.max(0.0001, b.t - a.t);
  const s = u * u * (3 - 2 * u);
  return {
    pos: lerp3(a.pos, b.pos, s),
    look: lerp3(a.look, b.look, s),
    skyA: a.sky,
    skyB: b.sky,
    mix: s,
    fire: lerp(a.fire, b.fire, s),
  };
}

function smooth(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * Time of day along the scroll: afternoon at 4:30, sunset over the ice-breakers,
 * full night through the bonfire, sunrise for the morning, bright for the pitch.
 * day: 0 night → 1 full daylight. glow: golden-hour strength. sun: sun height.
 */
export function sampleDaylight(t: number) {
  const x = clamp01(t);
  const day = 1 - smooth(0.06, 0.24, x) + smooth(0.72, 0.9, x);
  const glow = Math.max(0, 1 - Math.abs(x - 0.15) / 0.08) + Math.max(0, 1 - Math.abs(x - 0.79) / 0.08);
  const sun = x < 0.5 ? lerp(1, -0.25, smooth(0, 0.22, x)) : lerp(-0.25, 1, smooth(0.73, 1, x));
  return { day: clamp01(day), glow: clamp01(glow), sun };
}
