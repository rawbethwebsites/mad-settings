import type { Rules } from './types';

// Ludo. Pure logic only: the server runs this to referee camp rooms, the browser runs it vs the computer.
// One die. A 6 brings a seed out. Rolling a 6, capturing, or getting a seed home earns another roll.
// Landing on an opponent (off a safe square) sends their seed back to its yard. Home needs an exact roll.

export const TRACK = 52;
export const LAST_TRACK = 50; // progress 0..50 is the shared track
export const HOME = 56; // 51..55 is your home lane, 56 is home
export const YARD = -1;
export const START = [0, 13, 26, 39]; // where each colour comes out, on the shared track
export const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
export const COLOR_NAMES = ['Red', 'Green', 'Yellow', 'Blue'];
const ROLL_CAP = 900;

export interface State {
  names: string[];
  colors: number[]; // colour index by seat
  pos: number[][]; // seat -> 4 seed progress values
  turn: number;
  die: number | null; // rolled and waiting for a move
  lastRoll: number | null;
  rolls: number;
  note: string;
  last: { seat: number; seed: number; from: number; to: number; captured: { seat: number; seed: number }[] } | null;
  winner: number | null;
}

export type Action = { kind: 'roll' } | { kind: 'move'; seed: number };

export const colorsFor = (n: number) => (n === 2 ? [0, 2] : n === 3 ? [0, 1, 2] : [0, 1, 2, 3]);

export const fresh = (names: string[]): State => ({
  names,
  colors: colorsFor(names.length),
  pos: names.map(() => [YARD, YARD, YARD, YARD]),
  turn: 0,
  die: null,
  lastRoll: null,
  rolls: 0,
  note: '',
  last: null,
  winner: null,
});

/** Shared-track square for a seed at `progress`, or null in the yard / home lane */
export const square = (color: number, progress: number) =>
  progress >= 0 && progress <= LAST_TRACK ? (START[color] + progress) % TRACK : null;

export function target(s: State, seat: number, seed: number, roll: number): number | null {
  const p = s.pos[seat][seed];
  if (p === HOME) return null;
  if (p === YARD) return roll === 6 ? 0 : null;
  const to = p + roll;
  return to > HOME ? null : to;
}

export function legalSeeds(s: State, seat: number, roll: number): number[] {
  return [0, 1, 2, 3].filter(i => target(s, seat, i, roll) !== null);
}

const nextSeat = (s: State, seat: number) => (seat + 1) % s.names.length;

export function roll(s: State, value: number): State {
  const next: State = { ...s, pos: s.pos.map(p => [...p]), lastRoll: value, rolls: s.rolls + 1, last: null };
  const moves = legalSeeds(s, s.turn, value);
  if (moves.length) return { ...next, die: value, note: '' };
  return { ...next, die: null, turn: nextSeat(s, s.turn), note: value === 6 ? 'Rolled a 6 but no seed can move.' : `${s.names[s.turn]} rolled ${value} — no move.` };
}

export function move(s: State, seed: number): State {
  if (s.die === null) return s;
  const seat = s.turn;
  const to = target(s, seat, seed, s.die);
  if (to === null) return s;
  const pos = s.pos.map(p => [...p]);
  const from = pos[seat][seed];
  pos[seat][seed] = to;
  const captured: { seat: number; seed: number }[] = [];
  const sq = square(s.colors[seat], to);
  if (sq !== null && !SAFE.has(sq)) {
    pos.forEach((seeds, other) => {
      if (other === seat) return;
      seeds.forEach((p, i) => {
        if (square(s.colors[other], p) === sq) { seeds[i] = YARD; captured.push({ seat: other, seed: i }); }
      });
    });
  }
  const won = pos[seat].every(p => p === HOME);
  const again = !won && (s.die === 6 || captured.length > 0 || to === HOME);
  const note = won ? `${s.names[seat]} got every seed home!`
    : captured.length ? `${s.names[seat]} sent ${captured.map(c => s.names[c.seat]).join(' & ')} home!`
      : to === HOME ? `${s.names[seat]} got a seed home!`
        : '';
  return {
    ...s, pos, die: null, note,
    turn: won || again ? seat : nextSeat(s, seat),
    last: { seat, seed, from, to, captured },
    winner: won ? seat : null,
  };
}

export const progress = (s: State, seat: number) => s.pos[seat].reduce((a, p) => a + (p === YARD ? 0 : p + 1), 0);

export function finished(s: State) {
  return s.winner !== null || s.rolls >= ROLL_CAP;
}

// Computer: capture first, then get home, then come out, then step onto safety, then push the leader.
export function aiSeed(s: State, seat: number): number {
  const roll = s.die ?? 0;
  const options = legalSeeds(s, seat, roll);
  let best = options[0];
  let bestScore = -Infinity;
  for (const seed of options) {
    const to = target(s, seat, seed, roll)!;
    const from = s.pos[seat][seed];
    const sq = square(s.colors[seat], to);
    let score = to;
    if (sq !== null && !SAFE.has(sq) && s.pos.some((seeds, o) => o !== seat && seeds.some(p => square(s.colors[o], p) === sq))) score += 200;
    if (to === HOME) score += 150;
    if (from === YARD) score += 120;
    if (to > LAST_TRACK) score += 60;
    if (sq !== null && SAFE.has(sq)) score += 40;
    // Danger: an opponent 1-6 squares behind the landing square
    if (sq !== null && !SAFE.has(sq)) {
      const threatened = s.pos.some((seeds, o) => o !== seat && seeds.some(p => {
        const osq = square(s.colors[o], p);
        return osq !== null && ((sq - osq + TRACK) % TRACK) >= 1 && ((sq - osq + TRACK) % TRACK) <= 6;
      }));
      if (threatened) score -= 70;
    }
    if (score > bestScore) { bestScore = score; best = seed; }
  }
  return best;
}

// Fair die: secure random bytes, throwing away 252-255 so each face has exactly the same chance.
export function dieRoll(): number {
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (c?.getRandomValues) {
    const b = new Uint8Array(1);
    for (;;) {
      c.getRandomValues(b);
      if (b[0] < 252) return (b[0] % 6) + 1;
    }
  }
  return 1 + Math.floor(Math.random() * 6);
}

export const ludo: Rules<State, Action, State> = {
  min: 2,
  max: 4,
  turnSeconds: 30,
  points: { win: 80, draw: 30 },
  init: names => fresh(names.map((n, i) => n || `Player ${i + 1}`)),
  act(s, seat, a) {
    if (finished(s)) throw new Error('This game is over.');
    if (s.turn !== seat) throw new Error('It is not your turn.');
    if (a.kind === 'roll') {
      if (s.die !== null) throw new Error('Move a seed first.');
      return roll(s, dieRoll());
    }
    if (a.kind === 'move') {
      if (s.die === null) throw new Error('Roll the die first.');
      if (!Number.isInteger(a.seed) || target(s, seat, a.seed, s.die) === null) throw new Error('That seed cannot move.');
      return move(s, a.seed);
    }
    throw new Error('Unknown move.');
  },
  autoMove: (s, seat) => (s.die === null ? { kind: 'roll' } : { kind: 'move', seed: aiSeed(s, seat) }),
  turn: s => (finished(s) ? null : s.turn),
  outcome(s) {
    if (s.winner !== null) return { winners: [s.winner], reason: `${s.names[s.winner]} got every seed home` };
    if (s.rolls < ROLL_CAP) return null;
    const scores = s.names.map((_, i) => progress(s, i));
    const top = Math.max(...scores);
    return { winners: scores.flatMap((v, i) => (v === top ? [i] : [])), reason: 'Time up — furthest along wins' };
  },
  view: s => s,
};
