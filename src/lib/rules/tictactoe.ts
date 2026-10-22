import type { Rules } from './types';

export type P = 'X' | 'O';
export interface TttState {
  cells: (P | null)[];
  queue: Record<P, number[]>; // oldest first
}
export interface TttMatch extends TttState {
  turn: 0 | 1; // seat 0 plays X
}

export const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
export const fresh = (): TttState => ({ cells: Array(9).fill(null), queue: { X: [], O: [] } });
export const pieceOf = (seat: number): P => (seat === 0 ? 'X' : 'O');

export function place(s: TttState, p: P, i: number): TttState {
  const cells = [...s.cells];
  const q = [...s.queue[p], i];
  cells[i] = p;
  if (q.length > 3) {
    const old = q.shift() as number;
    cells[old] = null;
  }
  return { cells, queue: { ...s.queue, [p]: q } };
}

export function winner(cells: (P | null)[]): { p: P; line: number[] } | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return { p: cells[a] as P, line };
  }
  return null;
}

export const tictactoe: Rules<TttMatch, { cell: number }, TttMatch> = {
  min: 2,
  max: 2,
  turnSeconds: 20,
  points: { win: 40, draw: 0 },
  init: () => ({ ...fresh(), turn: 0 }),
  act(s, seat, a) {
    if (winner(s.cells)) throw new Error('This game is over.');
    if (s.turn !== seat) throw new Error('It is not your turn.');
    if (!Number.isInteger(a.cell) || a.cell < 0 || a.cell > 8 || s.cells[a.cell]) {
      throw new Error('Pick an empty square.');
    }
    return { ...place(s, pieceOf(seat), a.cell), turn: seat === 0 ? 1 : 0 };
  },
  turn: s => (winner(s.cells) ? null : s.turn),
  outcome(s) {
    const w = winner(s.cells);
    return w ? { winners: [w.p === 'X' ? 0 : 1], reason: 'Three in a row.' } : null;
  },
  view: s => s,
};
