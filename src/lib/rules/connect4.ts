import type { Rules } from './types';

export const ROWS = 6;
export const COLS = 7;
export type Cell = 0 | 1 | 2;
export type Board = Cell[][];
export interface C4Match {
  board: Board;
  turn: 0 | 1; // seat 0 drops 1s
}

export const emptyBoard = (): Board => Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(0));

export function drop(board: Board, col: number, p: Cell): Board | null {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) {
      const next = board.map(row => [...row]);
      next[r][col] = p;
      return next;
    }
  }
  return null;
}

export const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

export function findWin(board: Board): { p: Cell; cells: [number, number][] } | null {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p) continue;
      for (const [dr, dc] of DIRS) {
        const cells: [number, number][] = [[r, c]];
        for (let k = 1; k < 4; k++) {
          const rr = r + dr * k, cc = c + dc * k;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || board[rr][cc] !== p) break;
          cells.push([rr, cc]);
        }
        if (cells.length === 4) return { p, cells };
      }
    }
  }
  return null;
}

export const isFull = (board: Board) => board[0].every(v => v !== 0);

export const connect4: Rules<C4Match, { col: number }, C4Match> = {
  min: 2,
  max: 2,
  points: { win: 60, draw: 20 },
  init: () => ({ board: emptyBoard(), turn: 0 }),
  act(s, seat, a) {
    if (connect4.outcome(s)) throw new Error('This game is over.');
    if (s.turn !== seat) throw new Error('It is not your turn.');
    if (!Number.isInteger(a.col) || a.col < 0 || a.col >= COLS) throw new Error('Pick a column.');
    const board = drop(s.board, a.col, (seat + 1) as Cell);
    if (!board) throw new Error('That column is full.');
    return { board, turn: seat === 0 ? 1 : 0 };
  },
  turn: s => (connect4.outcome(s) ? null : s.turn),
  outcome(s) {
    const w = findWin(s.board);
    if (w) return { winners: [w.p - 1], reason: 'Four in a row.' };
    if (isFull(s.board)) return { winners: [], reason: 'The board is full.' };
    return null;
  },
  view: s => s,
};
