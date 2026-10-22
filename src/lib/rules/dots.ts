import type { Rules } from './types';

export const N = 4; // boxes per side
export type Owner = 0 | 1 | 2;
export interface DotsState {
  h: boolean[][]; // (N+1) x N
  v: boolean[][]; // N x (N+1)
  box: Owner[][]; // N x N
  turn: 1 | 2;
}
export type Line = { kind: 'h' | 'v'; r: number; c: number };

export const fresh = (): DotsState => ({
  h: Array.from({ length: N + 1 }, () => Array(N).fill(false)),
  v: Array.from({ length: N }, () => Array(N + 1).fill(false)),
  box: Array.from({ length: N }, () => Array<Owner>(N).fill(0)),
  turn: 1,
});

export const sides = (s: DotsState, r: number, c: number) =>
  [s.h[r][c], s.h[r + 1][c], s.v[r][c], s.v[r][c + 1]].filter(Boolean).length;

export function apply(s: DotsState, line: Line): DotsState {
  const next: DotsState = {
    h: s.h.map(r => [...r]),
    v: s.v.map(r => [...r]),
    box: s.box.map(r => [...r]),
    turn: s.turn,
  };
  next[line.kind][line.r][line.c] = true;
  let made = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (next.box[r][c] === 0 && sides(next, r, c) === 4) {
        next.box[r][c] = s.turn;
        made++;
      }
    }
  }
  if (made === 0) next.turn = s.turn === 1 ? 2 : 1; // a box earns another go
  return next;
}

export function freeLines(s: DotsState): Line[] {
  const out: Line[] = [];
  for (let r = 0; r <= N; r++) for (let c = 0; c < N; c++) if (!s.h[r][c]) out.push({ kind: 'h', r, c });
  for (let r = 0; r < N; r++) for (let c = 0; c <= N; c++) if (!s.v[r][c]) out.push({ kind: 'v', r, c });
  return out;
}

export const boxCount = (s: DotsState, o: Owner) => s.box.flat().filter(b => b === o).length;

// Seat 0 owns boxes marked 1, seat 1 owns boxes marked 2
export const dots: Rules<DotsState, Line, DotsState> = {
  min: 2,
  max: 2,
  turnSeconds: 25,
  points: { win: 70, draw: 25 },
  init: fresh,
  act(s, seat, line) {
    if (dots.outcome(s)) throw new Error('This game is over.');
    if (s.turn !== seat + 1) throw new Error('It is not your turn.');
    const grid = line.kind === 'h' ? s.h : line.kind === 'v' ? s.v : null;
    if (!grid || grid[line.r]?.[line.c] !== false) throw new Error('Pick an empty line.');
    return apply(s, { kind: line.kind, r: line.r, c: line.c });
  },
  turn: s => (dots.outcome(s) ? null : s.turn - 1),
  outcome(s) {
    const a = boxCount(s, 1), b = boxCount(s, 2);
    if (a + b < N * N) return null;
    if (a === b) return { winners: [], reason: `${a} boxes each.` };
    return { winners: [a > b ? 0 : 1], reason: `${Math.max(a, b)} boxes to ${Math.min(a, b)}.` };
  },
  view: s => s,
};
