import type { Rules } from './types';

// Ayo (Oware rules). Pure logic only — the server runs this to referee camp rooms,
// and the browser runs it for vs-computer. No React in here.
export const WIN_AT = 25;
export const MOVE_CAP = 200;

export interface State {
  pits: number[];
  store: [number, number]; // [seat 0, seat 1]
  turn: 0 | 1;
  moves: number;
  last: number | null;
  note: string;
  names: [string, string];
}

export const fresh = (names: [string, string]): State => ({
  pits: Array(12).fill(4),
  store: [0, 0],
  turn: 0,
  moves: 0,
  last: null,
  note: '',
  names,
});

export const owner = (i: number): 0 | 1 => (i < 6 ? 0 : 1);
export const sideRange = (p: 0 | 1) => (p === 0 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11]);
export const seedsOn = (pits: number[], p: 0 | 1) => sideRange(p).reduce((a, i) => a + pits[i], 0);

// Applies a sow + capture. Returns null if the move is not allowed.
export function sow(s: State, pit: number): { pits: number[]; gain: number; last: number } | null {
  const p = owner(pit);
  if (s.pits[pit] === 0) return null;
  const pits = [...s.pits];
  let n = pits[pit];
  pits[pit] = 0;
  let i = pit;
  while (n > 0) {
    i = (i + 1) % 12;
    if (i === pit) continue;
    pits[i]++;
    n--;
  }
  const last = i;
  let gain = 0;
  if (owner(last) !== p && (pits[last] === 2 || pits[last] === 3)) {
    const grabbed = [...pits];
    let j = last;
    let g = 0;
    while (owner(j) !== p && (grabbed[j] === 2 || grabbed[j] === 3)) {
      g += grabbed[j];
      grabbed[j] = 0;
      j = (j + 11) % 12;
    }
    // Taking every opposing seed is not allowed: the sowing stands, no capture
    if (seedsOn(grabbed, p === 0 ? 1 : 0) > 0) {
      gain = g;
      for (let k = 0; k < 12; k++) pits[k] = grabbed[k];
    }
  }
  return { pits, gain, last };
}

export function legalMoves(s: State, p: 0 | 1): number[] {
  const mine = sideRange(p).filter(i => s.pits[i] > 0);
  if (seedsOn(s.pits, p === 0 ? 1 : 0) > 0) return mine;
  // Opponent has nothing: you must feed them if you can
  const feeding = mine.filter(i => {
    const r = sow(s, i);
    return r !== null && seedsOn(r.pits, p === 0 ? 1 : 0) > 0;
  });
  return feeding;
}

export function step(s: State, pit: number): State {
  const p = s.turn;
  const r = sow(s, pit);
  if (!r) return s;
  const store: [number, number] = [...s.store] as [number, number];
  store[p] += r.gain;
  const next: State = {
    pits: r.pits,
    store,
    turn: p === 0 ? 1 : 0,
    moves: s.moves + 1,
    last: r.last,
    note: r.gain ? `${s.names[p]} captured ${r.gain}!` : '',
    names: s.names,
  };
  // The player to move cannot move: the other side keeps what is left
  if (legalMoves(next, next.turn).length === 0) {
    const other: 0 | 1 = next.turn === 0 ? 1 : 0;
    next.store[other] += seedsOn(next.pits, other);
    next.pits = next.pits.map((v, i) => (owner(i) === other ? 0 : v));
    next.note = 'No more moves — remaining seeds are collected.';
  }
  return next;
}

export function finished(s: State) {
  return s.store[0] >= WIN_AT || s.store[1] >= WIN_AT || s.pits.every(v => v === 0) || s.moves >= MOVE_CAP;
}

export function aiPit(s: State): number {
  const moves = legalMoves(s, 1);
  let best = -Infinity;
  let pick: number[] = [];
  for (const m of moves) {
    const r = sow(s, m);
    if (!r) continue;
    let score = r.gain * 10;
    // Look one reply ahead: don't leave captures on the table for the human
    const after: State = { ...s, pits: r.pits, turn: 0 };
    let worst = 0;
    for (const h of legalMoves(after, 0)) {
      const hr = sow(after, h);
      if (hr) worst = Math.max(worst, hr.gain);
    }
    score -= worst * 8;
    score += seedsOn(r.pits, 1) - seedsOn(r.pits, 0) * 0.3;
    if (score > best) { best = score; pick = [m]; }
    else if (score === best) pick.push(m);
  }
  return pick[Math.floor(Math.random() * pick.length)];
}

export const ayo: Rules<State, { pit: number }, State> = {
  min: 2,
  max: 2,
  turnSeconds: 30,
  points: { win: 80, draw: 30 },
  init: names => fresh([names[0] ?? 'Player 1', names[1] ?? 'Player 2']),
  act(s, seat, a) {
    if (finished(s)) throw new Error('This game is over.');
    if (s.turn !== seat) throw new Error('It is not your turn.');
    if (!Number.isInteger(a.pit) || a.pit < 0 || a.pit > 11 || owner(a.pit) !== seat) {
      throw new Error('That is not your pit.');
    }
    if (!legalMoves(s, seat as 0 | 1).includes(a.pit)) throw new Error('That pit has no seeds.');
    return step(s, a.pit);
  },
  turn: s => (finished(s) ? null : s.turn),
  outcome(s) {
    if (!finished(s)) return null;
    if (s.store[0] > s.store[1]) return { winners: [0], reason: `${s.store[0]} seeds to ${s.store[1]}.` };
    if (s.store[1] > s.store[0]) return { winners: [1], reason: `${s.store[1]} seeds to ${s.store[0]}.` };
    return { winners: [], reason: `${s.store[0]} seeds to ${s.store[1]}.` };
  },
  view: s => s,
};
