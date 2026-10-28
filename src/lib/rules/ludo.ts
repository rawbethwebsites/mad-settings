import type { Rules } from './types';

// Ludo, Naija rules. Pure logic only: the server runs this to referee camp rooms, the browser runs it vs the computer.
// Two dice: use each die on any seed (or both on one). A 6 on a die brings a seed out.
// Landing on an opponent sends their seed back to its yard, and your seed goes straight home.
// Rolling a 6, capturing, or getting a seed home earns another roll. Home needs an exact count.

export const TRACK = 52;
export const LAST_TRACK = 50; // progress 0..50 is the shared track
export const HOME = 56; // 51..55 is your home lane, 56 is home
export const YARD = -1;
export const START = [0, 13, 26, 39]; // where each colour comes out, on the shared track
export const SAFE = new Set<number>(); // no safe squares: any landing captures
export const COLOR_NAMES = ['Red', 'Green', 'Yellow', 'Blue'];
const ROLL_CAP = 900;

export interface State {
  names: string[];
  colors: number[]; // colour index by seat
  pos: number[][]; // seat -> 4 seed progress values
  turn: number;
  dice: number[]; // rolled dice still to play this turn
  lastRoll: number[] | null; // both dice as rolled
  bonus: boolean; // this turn earned another roll
  rolls: number;
  note: string;
  last: { seat: number; seed: number; from: number; to: number; landed: number; captured: { seat: number; seed: number }[] } | null;
  winner: number | null;
}

export type Action = { kind: 'roll' } | { kind: 'move'; seed: number; die?: number };

export const colorsFor = (n: number) => (n === 2 ? [0, 2] : n === 3 ? [0, 1, 2] : [0, 1, 2, 3]);

export const fresh = (names: string[]): State => ({
  names,
  colors: colorsFor(names.length),
  pos: names.map(() => [YARD, YARD, YARD, YARD]),
  turn: 0,
  dice: [],
  lastRoll: null,
  bonus: false,
  rolls: 0,
  note: '',
  last: null,
  winner: null,
});

// Games saved under the old one-die rules carry on under the new ones
export function upgrade(s: State & { die?: number | null }): State {
  if (Array.isArray(s.dice)) return s;
  const { die, ...rest } = s;
  const old = rest.lastRoll as unknown as number | null;
  return { ...rest, dice: die != null ? [die] : [], lastRoll: old != null ? [old] : null, bonus: false };
}

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

/** Dice (by index) that can still move something */
export const playableDice = (s: State, seat: number) => s.dice.flatMap((d, i) => (legalSeeds(s, seat, d).length ? [i] : []));

/** Opponent seeds sitting on the square a seed would land on */
export function victims(s: State, seat: number, to: number) {
  const sq = square(s.colors[seat], to);
  if (sq === null || SAFE.has(sq)) return [];
  return s.pos.flatMap((seeds, other) => other === seat ? [] : seeds.flatMap((p, i) => (square(s.colors[other], p) === sq ? [{ seat: other, seed: i }] : [])));
}

const nextSeat = (s: State, seat: number) => (seat + 1) % s.names.length;

// The turn is over: roll again if it earned one, otherwise pass on
function endTurn(s: State, note: string): State {
  const again = s.winner === null && (s.bonus || (s.lastRoll ?? []).includes(6));
  return { ...s, dice: [], bonus: false, turn: again ? s.turn : nextSeat(s, s.turn), note: note || (again ? `${s.names[s.turn]} rolls again!` : '') };
}

export function roll(s: State, a: number, b: number): State {
  const next: State = { ...s, pos: s.pos.map(p => [...p]), dice: [a, b], lastRoll: [a, b], bonus: false, rolls: s.rolls + 1, last: null, note: '' };
  if (playableDice(next, s.turn).length) return next;
  return { ...next, dice: [], turn: nextSeat(s, s.turn), note: `${s.names[s.turn]} rolled ${a} and ${b} — no move.` };
}

export function move(s: State, seed: number, die = 0): State {
  const value = s.dice[die];
  if (value === undefined) return s;
  const seat = s.turn;
  const landed = target(s, seat, seed, value);
  if (landed === null) return s;
  const pos = s.pos.map(p => [...p]);
  const from = pos[seat][seed];
  const captured = victims(s, seat, landed);
  captured.forEach(c => { pos[c.seat][c.seed] = YARD; });
  // A seed that captures goes straight home
  const to = captured.length ? HOME : landed;
  pos[seat][seed] = to;
  const won = pos[seat].every(p => p === HOME);
  const note = won ? `${s.names[seat]} got every seed home!`
    : captured.length ? `${s.names[seat]} sent ${captured.map(c => s.names[c.seat]).join(' & ')} home and finished a seed!`
      : to === HOME ? `${s.names[seat]} got a seed home!`
        : '';
  const next: State = {
    ...s, pos, note,
    dice: s.dice.filter((_, i) => i !== die),
    bonus: s.bonus || captured.length > 0 || to === HOME,
    last: { seat, seed, from, to, landed, captured },
    winner: won ? seat : null,
  };
  if (won) return { ...next, dice: [] };
  if (playableDice(next, seat).length) return next;
  return endTurn(next, note);
}

export const progress = (s: State, seat: number) => s.pos[seat].reduce((a, p) => a + (p === YARD ? 0 : p + 1), 0);

export function finished(s: State) {
  return s.winner !== null || s.rolls >= ROLL_CAP;
}

// Computer: capture first, then get home, then come out, then step out of reach, then push the leader.
export function aiMove(s: State, seat: number): { seed: number; die: number } {
  let best = { seed: 0, die: 0 };
  let bestScore = -Infinity;
  s.dice.forEach((roll, die) => {
    for (const seed of legalSeeds(s, seat, roll)) {
      const to = target(s, seat, seed, roll)!;
      const from = s.pos[seat][seed];
      const sq = square(s.colors[seat], to);
      let score = to;
      if (victims(s, seat, to).length) score += 300;
      if (to === HOME) score += 150;
      if (from === YARD) score += 120;
      if (to > LAST_TRACK) score += 60;
      // Danger: an opponent 1-12 squares behind the landing square (two dice reach 12)
      if (sq !== null) {
        const threatened = s.pos.some((seeds, o) => o !== seat && seeds.some(p => {
          const osq = square(s.colors[o], p);
          const gap = osq === null ? 0 : (sq - osq + TRACK) % TRACK;
          return gap >= 1 && gap <= 12;
        }));
        if (threatened) score -= 70;
      }
      if (score > bestScore) { bestScore = score; best = { seed, die }; }
    }
  });
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
  act(old, seat, a) {
    const s = upgrade(old);
    if (finished(s)) throw new Error('This game is over.');
    if (s.turn !== seat) throw new Error('It is not your turn.');
    if (a.kind === 'roll') {
      if (s.dice.length) throw new Error('Move a seed first.');
      return roll(s, dieRoll(), dieRoll());
    }
    if (a.kind === 'move') {
      if (!s.dice.length) throw new Error('Roll the dice first.');
      const die = a.die ?? 0;
      if (!Number.isInteger(die) || s.dice[die] === undefined) throw new Error('Pick one of your dice.');
      if (!Number.isInteger(a.seed) || target(s, seat, a.seed, s.dice[die]) === null) throw new Error('That seed cannot move with that die.');
      return move(s, a.seed, die);
    }
    throw new Error('Unknown move.');
  },
  autoMove: (old, seat) => { const s = upgrade(old); return s.dice.length ? { kind: 'move', ...aiMove(s, seat) } : { kind: 'roll' }; },
  turn: s => (finished(s) ? null : s.turn),
  outcome(s) {
    if (s.winner !== null) return { winners: [s.winner], reason: `${s.names[s.winner]} got every seed home` };
    if (s.rolls < ROLL_CAP) return null;
    const scores = s.names.map((_, i) => progress(s, i));
    const top = Math.max(...scores);
    return { winners: scores.flatMap((v, i) => (v === top ? [i] : [])), reason: 'Time up — furthest along wins' };
  },
  view: s => upgrade(s),
};
