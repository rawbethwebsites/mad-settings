import type { Rules } from './types';

// Ludo, Naija rules. Pure logic only: the server runs this to referee camp rooms, the browser runs it vs the computer.
// Two dice: play each die on a seed of your choice, or both dice on one seed. A 6 brings a seed out.
// Landing on a lone opponent seed sends it back to its yard, and your seed goes straight home.
// Two or more seeds of one colour on a square are a stack: nobody can land on it, and only a 6 can pass it.
// Only a 6-6 throw earns another roll. Home needs an exact count.

export const TRACK = 52;
export const LAST_TRACK = 50; // progress 0..50 is the shared track
export const HOME = 56; // 51..55 is your home lane, 56 is home
export const YARD = -1;
export const START = [0, 13, 26, 39]; // where each colour comes out, on the shared track
export const SAFE = new Set<number>(); // no safe squares
export const COLOR_NAMES = ['Red', 'Green', 'Yellow', 'Blue'];
export const BOTH = 2; // die choice: both dice on one seed
const ROLL_CAP = 900;

export interface State {
  names: string[];
  colors: number[]; // colour index by seat
  pos: number[][]; // seat -> 4 seed progress values
  turn: number;
  dice: number[]; // rolled dice still to play this turn
  lastRoll: number[] | null; // both dice as rolled
  rolls: number;
  note: string;
  last: { seat: number; seed: number; from: number; to: number; landed: number; captured: { seat: number; seed: number }[] } | null;
  winner: number | null;
}

/** die: 0 or 1 plays that die, BOTH plays both dice on the seed */
export type Action = { kind: 'roll' } | { kind: 'move'; seed: number; die?: number };

export const colorsFor = (n: number) => (n === 2 ? [0, 2] : n === 3 ? [0, 1, 2] : [0, 1, 2, 3]);

export const fresh = (names: string[]): State => ({
  names,
  colors: colorsFor(names.length),
  pos: names.map(() => [YARD, YARD, YARD, YARD]),
  turn: 0,
  dice: [],
  lastRoll: null,
  rolls: 0,
  note: '',
  last: null,
  winner: null,
});

// Games saved under older rules carry on under these
export function upgrade(s: State & { die?: number | null }): State {
  if (Array.isArray(s.dice)) return s;
  const { die, ...rest } = s;
  const old = rest.lastRoll as unknown as number | null;
  return { ...rest, dice: die != null ? [die] : [], lastRoll: old != null ? [old] : null };
}

/** Shared-track square for a seed at `progress`, or null in the yard / home lane */
export const square = (color: number, progress: number) =>
  progress >= 0 && progress <= LAST_TRACK ? (START[color] + progress) % TRACK : null;

/** Opponent seeds on a shared-track square, by seat */
function others(s: State, seat: number, sq: number) {
  return s.pos.flatMap((seeds, other) => other === seat ? [] : seeds.flatMap((p, i) => (square(s.colors[other], p) === sq ? [{ seat: other, seed: i }] : [])));
}
const isStack = (found: { seat: number }[]) => found.some(f => found.filter(g => g.seat === f.seat).length >= 2);

/** The dice a choice plays: one die, or both */
export const diceFor = (s: State, die: number) => (die === BOTH ? (s.dice.length === 2 ? s.dice : []) : s.dice[die] !== undefined ? [s.dice[die]] : []);

/** Where a seed ends up with that choice of dice, or null if the move isn't allowed */
export function plan(s: State, seat: number, seed: number, die: number): { landed: number; captured: { seat: number; seed: number }[] } | null {
  const values = diceFor(s, die);
  if (!values.length) return null;
  const from = s.pos[seat][seed];
  if (from === HOME) return null;
  const total = values.reduce((a, b) => a + b, 0);
  let start = from, steps = total;
  if (from === YARD) {
    if (!values.includes(6)) return null;
    start = 0; steps = total - 6; // the 6 brings it out, the other die (if any) moves it on
  }
  const landed = start + steps;
  if (landed > HOME) return null;
  const six = values.includes(6);
  // Every shared square it touches, from where it comes out or the next square, up to where it lands
  for (let q = from === YARD ? 0 : from + 1; q <= Math.min(landed, LAST_TRACK); q++) {
    const found = others(s, seat, square(s.colors[seat], q)!);
    if (!isStack(found)) continue;
    if (q === landed) return null; // can't land on a stack
    if (!six) return null; // only a 6 passes a stack
  }
  const sq = square(s.colors[seat], landed);
  return { landed, captured: sq === null ? [] : others(s, seat, sq) };
}

/** Die choices (0, 1, BOTH) that can move something */
export function choices(s: State, seat: number) {
  const opts = s.dice.length === 2 ? [0, 1, BOTH] : s.dice.length ? [0] : [];
  return opts.filter(d => [0, 1, 2, 3].some(i => plan(s, seat, i, d)));
}

export function legalSeeds(s: State, seat: number, die: number): number[] {
  return [0, 1, 2, 3].filter(i => plan(s, seat, i, die) !== null);
}

const nextSeat = (s: State, seat: number) => (seat + 1) % s.names.length;
const doubleSix = (s: State) => s.lastRoll?.length === 2 && s.lastRoll[0] === 6 && s.lastRoll[1] === 6;

// The turn is over: a 6-6 throw rolls again, anything else passes on
function endTurn(s: State, note: string): State {
  const again = s.winner === null && doubleSix(s);
  return { ...s, dice: [], turn: again ? s.turn : nextSeat(s, s.turn), note: again ? `${note ? `${note} ` : ''}6-6! ${s.names[s.turn]} rolls again.` : note };
}

export function roll(s: State, a: number, b: number): State {
  const next: State = { ...s, pos: s.pos.map(p => [...p]), dice: [a, b], lastRoll: [a, b], rolls: s.rolls + 1, last: null, note: '' };
  if (choices(next, s.turn).length) return next;
  return endTurn(next, `${s.names[s.turn]} rolled ${a} and ${b} — no move.`);
}

export function move(s: State, seed: number, die = 0): State {
  const seat = s.turn;
  const p = plan(s, seat, seed, die);
  if (!p) return s;
  const pos = s.pos.map(x => [...x]);
  const from = pos[seat][seed];
  p.captured.forEach(c => { pos[c.seat][c.seed] = YARD; });
  // A seed that eats goes straight home
  const to = p.captured.length ? HOME : p.landed;
  pos[seat][seed] = to;
  const won = pos[seat].every(x => x === HOME);
  const note = won ? `${s.names[seat]} got every seed home!`
    : p.captured.length ? `${s.names[seat]} sent ${p.captured.map(c => s.names[c.seat]).join(' & ')} home and finished a seed!`
      : to === HOME ? `${s.names[seat]} got a seed home!`
        : '';
  const next: State = {
    ...s, pos, note,
    dice: die === BOTH ? [] : s.dice.filter((_, i) => i !== die),
    last: { seat, seed, from, to, landed: p.landed, captured: p.captured },
    winner: won ? seat : null,
  };
  if (won) return { ...next, dice: [] };
  if (choices(next, seat).length) return next;
  return endTurn(next, note);
}

export const progress = (s: State, seat: number) => s.pos[seat].reduce((a, p) => a + (p === YARD ? 0 : p + 1), 0);

export function finished(s: State) {
  return s.winner !== null || s.rolls >= ROLL_CAP;
}

// Computer: eat first, then get home, then come out, then step out of reach, then push the leader.
export function aiMove(s: State, seat: number): { seed: number; die: number } {
  let best = { seed: 0, die: 0 };
  let bestScore = -Infinity;
  for (const die of choices(s, seat)) {
    for (const seed of legalSeeds(s, seat, die)) {
      const p = plan(s, seat, seed, die)!;
      const from = s.pos[seat][seed];
      const sq = square(s.colors[seat], p.landed);
      let score = p.landed;
      if (p.captured.length) score += 300;
      if (p.landed === HOME) score += 150;
      if (from === YARD) score += 120;
      if (p.landed > LAST_TRACK) score += 60;
      // Joining your own seed makes a stack nobody can eat
      if (s.pos[seat].some((x, i) => i !== seed && x === p.landed && p.landed <= LAST_TRACK)) score += 50;
      // Danger: an opponent 1-12 squares behind the landing square (two dice reach 12)
      if (sq !== null && !p.captured.length) {
        const threatened = s.pos.some((seeds, o) => o !== seat && seeds.some(x => {
          const osq = square(s.colors[o], x);
          const gap = osq === null ? 0 : (sq - osq + TRACK) % TRACK;
          return gap >= 1 && gap <= 12;
        }));
        if (threatened) score -= 70;
      }
      if (die !== BOTH) score += 5; // keep the other die for later when it's close
      if (score > bestScore) { bestScore = score; best = { seed, die }; }
    }
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
      if (!Number.isInteger(die) || !diceFor(s, die).length) throw new Error('Pick one of your dice.');
      if (!Number.isInteger(a.seed) || !plan(s, seat, a.seed, die)) throw new Error('That seed cannot move with that die. A stack blocks the way unless you use a 6.');
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
