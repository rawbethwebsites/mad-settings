'use client';

import { useEffect, useState } from 'react';
import { Btn, Result } from '@/components/arcade/ui';
import {
  COLS,
  DIRS,
  ROWS,
  drop,
  emptyBoard,
  findWin,
  type Board,
  type C4Match,
  type Cell,
} from '@/lib/rules/connect4';
import type { OnlineProps } from '@/lib/rules/types';

function heuristic(board: Board, me: Cell): number {
  const opp: Cell = me === 1 ? 2 : 1;
  let score = 0;
  for (let r = 0; r < ROWS; r++) if (board[r][3] === me) score += 3;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of DIRS) {
        const er = r + dr * 3, ec = c + dc * 3;
        if (er < 0 || er >= ROWS || ec < 0 || ec >= COLS) continue;
        let mine = 0, theirs = 0;
        for (let k = 0; k < 4; k++) {
          const v = board[r + dr * k][c + dc * k];
          if (v === me) mine++;
          else if (v === opp) theirs++;
        }
        if (theirs === 0) score += mine === 3 ? 6 : mine === 2 ? 2 : 0;
        if (mine === 0) score -= theirs === 3 ? 8 : theirs === 2 ? 2 : 0;
      }
    }
  }
  return score;
}

// Score from `me`'s point of view, `turn` is who moves next
function search(board: Board, depth: number, alpha: number, beta: number, turn: Cell, me: Cell): number {
  const win = findWin(board);
  if (win) return win.p === me ? 100000 + depth : -100000 - depth;
  if (board[0].every(v => v !== 0)) return 0;
  if (depth === 0) return heuristic(board, me);
  const next: Cell = turn === 1 ? 2 : 1;
  const order = [3, 2, 4, 1, 5, 0, 6];
  if (turn === me) {
    let best = -Infinity;
    for (const c of order) {
      const b = drop(board, c, turn);
      if (!b) continue;
      best = Math.max(best, search(b, depth - 1, alpha, beta, next, me));
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  }
  let best = Infinity;
  for (const c of order) {
    const b = drop(board, c, turn);
    if (!b) continue;
    best = Math.min(best, search(b, depth - 1, alpha, beta, next, me));
    beta = Math.min(beta, best);
    if (alpha >= beta) break;
  }
  return best;
}

function aiColumn(board: Board): number {
  let best = -Infinity;
  let cols: number[] = [];
  for (const c of [3, 2, 4, 1, 5, 0, 6]) {
    const b = drop(board, c, 2);
    if (!b) continue;
    const s = search(b, 4, -Infinity, Infinity, 1, 2);
    if (s > best) { best = s; cols = [c]; }
    else if (s === best) cols.push(c);
  }
  return cols[Math.floor(Math.random() * cols.length)];
}

function BoardGrid({
  board,
  winCells,
  enabled,
  onDrop,
}: {
  board: Board;
  winCells: [number, number][];
  enabled: boolean;
  onDrop: (col: number) => void;
}) {
  const isWin = (r: number, c: number) => winCells.some(([rr, cc]) => rr === r && cc === c);
  return (
    <div className="grid grid-cols-7 gap-1 p-2 bg-brand-black poster-shadow" role="grid" aria-label="Connect 4 board">
      {Array.from({ length: COLS }, (_, c) => (
        <button
          key={c}
          onClick={() => onDrop(c)}
          disabled={!enabled || board[0][c] !== 0}
          aria-label={`Drop in column ${c + 1}`}
          className="flex flex-col gap-1 disabled:cursor-not-allowed"
        >
          {board.map((row, r) => (
            <span
              key={r}
              className={`block aspect-square rounded-full border-2 ${
                isWin(r, c) ? 'border-brand-acid' : 'border-brand-cream/20'
              } ${row[c] === 1 ? 'bg-brand-coral' : row[c] === 2 ? 'bg-brand-purple' : 'bg-brand-cream/10'}`}
            />
          ))}
        </button>
      ))}
    </div>
  );
}

export default function Connect4({ award }: { award: (n: number) => void }) {
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [turn, setTurn] = useState<1 | 2>(1);
  const [over, setOver] = useState<{ winner: Cell; cells: [number, number][]; points: number } | null>(null);

  const finish = (next: Board) => {
    const w = findWin(next);
    const full = next[0].every(v => v !== 0);
    if (!w && !full) return false;
    const points = w ? (w.p === 1 ? 60 : 0) : 20;
    award(points);
    setOver({ winner: w ? w.p : 0, cells: w ? w.cells : [], points });
    return true;
  };

  const play = (col: number) => {
    if (turn !== 1 || over) return;
    const next = drop(board, col, 1);
    if (!next) return;
    setBoard(next);
    if (!finish(next)) setTurn(2);
  };

  useEffect(() => {
    if (turn !== 2 || over) return;
    const t = window.setTimeout(() => {
      const col = aiColumn(board);
      const next = drop(board, col, 2);
      if (!next) return;
      setBoard(next);
      if (!finish(next)) setTurn(1);
    }, 500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, over, board]);

  const reset = () => {
    setBoard(emptyBoard());
    setTurn(1);
    setOver(null);
  };

  return (
    <div>
      <div className={`mb-4 p-3 poster-border text-center font-display font-black uppercase ${turn === 1 && !over ? 'bg-brand-acid' : 'bg-white'}`}>
        {over ? 'GAME OVER' : turn === 1 ? 'YOUR TURN · DROP A DISC' : 'COMPUTER IS THINKING…'}
      </div>

      <BoardGrid board={board} winCells={over?.cells ?? []} enabled={turn === 1 && !over} onDrop={play} />

      <div className="flex justify-between mt-3 font-display font-bold text-xs uppercase">
        <span><span className="inline-block w-3 h-3 rounded-full bg-brand-coral mr-1 align-middle" />YOU</span>
        <span><span className="inline-block w-3 h-3 rounded-full bg-brand-purple mr-1 align-middle" />COMPUTER</span>
      </div>

      {over && (
        <Result
          tone={over.winner === 1 ? 'win' : over.winner === 2 ? 'lose' : 'draw'}
          emoji={over.winner === 1 ? '🏆' : over.winner === 2 ? '🤖' : '🤝'}
          title={over.winner === 1 ? 'FOUR IN A ROW!' : over.winner === 2 ? 'COMPUTER WINS' : 'DRAW'}
          points={over.points}
          onAgain={reset}
        />
      )}
      {!over && <Btn variant="light" className="w-full mt-4" onClick={reset}>RESTART</Btn>}
    </div>
  );
}

// Online: seat 0 drops red (1), seat 1 drops purple (2). Your colour stays put.
export function Connect4Online({ view, seat, names, act }: OnlineProps<C4Match, { col: number }>) {
  const [err, setErr] = useState('');
  const win = findWin(view.board);
  const full = view.board[0].every(v => v !== 0);
  const over = !!win || full;
  const yourTurn = seat !== null && !over && view.turn === seat;
  const youIs: Cell = ((seat ?? 0) + 1) as Cell;

  const tapCol = async (col: number) => {
    if (!yourTurn) return;
    setErr('');
    try {
      await act({ col });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg.replace(/^Uncaught Error: /, '').split('\n')[0]);
    }
  };

  const me = seat !== null ? names[seat] : null;
  const opp = seat !== null ? names[seat === 0 ? 1 : 0] : null;

  return (
    <div>
      <div className={`mb-4 p-3 poster-border text-center font-display font-black uppercase ${yourTurn ? 'bg-brand-acid' : 'bg-white'}`} aria-live="polite">
        {over ? 'GAME OVER' : yourTurn ? 'YOUR TURN · DROP A DISC' : `${opp ?? 'THEY'} IS PLAYING…`}
      </div>

      <BoardGrid board={view.board} winCells={win?.cells ?? []} enabled={yourTurn} onDrop={tapCol} />

      <div className="flex justify-between mt-3 font-display font-bold text-xs uppercase">
        <span>
          <span className={`inline-block w-3 h-3 rounded-full mr-1 align-middle ${youIs === 1 ? 'bg-brand-coral' : 'bg-brand-purple'}`} />
          {me ? `${me} · YOU` : 'YOU'}
        </span>
        <span>
          <span className={`inline-block w-3 h-3 rounded-full mr-1 align-middle ${youIs === 1 ? 'bg-brand-purple' : 'bg-brand-coral'}`} />
          {opp ?? 'THEM'}
        </span>
      </div>

      {err && (
        <div role="alert" className="mt-3 p-3 poster-border bg-brand-coral font-display font-bold text-sm text-center">
          {err}
        </div>
      )}
    </div>
  );
}
