'use client';

import { useEffect, useState } from 'react';
import { Btn, Result } from '@/components/arcade/ui';

type P = 'X' | 'O';
interface State {
  cells: (P | null)[];
  queue: Record<P, number[]>; // oldest first
}

const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const fresh = (): State => ({ cells: Array(9).fill(null), queue: { X: [], O: [] } });

function place(s: State, p: P, i: number): State {
  const cells = [...s.cells];
  const q = [...s.queue[p], i];
  cells[i] = p;
  if (q.length > 3) {
    const old = q.shift() as number;
    cells[old] = null;
  }
  return { cells, queue: { ...s.queue, [p]: q } };
}

function winner(cells: (P | null)[]): { p: P; line: number[] } | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return { p: cells[a] as P, line };
  }
  return null;
}

function aiMove(s: State): number {
  const empty = s.cells.map((v, i) => (v ? -1 : i)).filter(i => i >= 0);
  for (const i of empty) if (winner(place(s, 'O', i).cells)?.p === 'O') return i;
  for (const i of empty) if (winner(place(s, 'X', i).cells)?.p === 'X') return i;
  const pref = [4, 0, 2, 6, 8, 1, 3, 5, 7].filter(i => empty.includes(i));
  // Mostly sensible, a little random so it isn't always the same game
  return Math.random() < 0.75 ? pref[0] : pref[Math.floor(Math.random() * pref.length)];
}

export default function EndlessTicTacToe({ award }: { award: (n: number) => void }) {
  const [s, setS] = useState<State>(fresh);
  const [turn, setTurn] = useState<P>('X');
  const [win, setWin] = useState<{ p: P; line: number[] } | null>(null);
  const [points, setPoints] = useState(0);

  const after = (next: State, mover: P) => {
    const w = winner(next.cells);
    if (w) {
      const pts = w.p === 'X' ? 40 : 0;
      award(pts);
      setPoints(pts);
      setWin(w);
      return;
    }
    setTurn(mover === 'X' ? 'O' : 'X');
  };

  const tap = (i: number) => {
    if (turn !== 'X' || win || s.cells[i]) return;
    const next = place(s, 'X', i);
    setS(next);
    after(next, 'X');
  };

  useEffect(() => {
    if (turn !== 'O' || win) return;
    const t = window.setTimeout(() => {
      const next = place(s, 'O', aiMove(s));
      setS(next);
      after(next, 'O');
    }, 500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, win, s]);

  const reset = () => { setS(fresh()); setTurn('X'); setWin(null); setPoints(0); };
  // The piece that vanishes on the next placement for whoever is up
  const fading = (i: number) => !win && s.queue[turn].length === 3 && s.queue[turn][0] === i;

  return (
    <div>
      <p className="font-body text-center mb-4">
        Only <b>3 pieces</b> each. Place a 4th and your oldest one disappears. Get 3 in a row!
      </p>
      <div className={`mb-4 p-3 poster-border text-center font-display font-black uppercase ${turn === 'X' && !win ? 'bg-brand-acid' : 'bg-white'}`}>
        {win ? 'GAME OVER' : turn === 'X' ? 'YOUR TURN' : 'COMPUTER IS THINKING…'}
      </div>
      <div className="grid grid-cols-3 gap-2 aspect-square">
        {s.cells.map((v, i) => (
          <button
            key={i}
            onClick={() => tap(i)}
            aria-label={`Square ${i + 1}${v ? ` ${v}` : ''}`}
            className={`poster-border font-display font-black text-6xl flex items-center justify-center ${
              win?.line.includes(i) ? 'bg-brand-acid' : 'bg-white'
            } ${v === 'X' ? 'text-brand-coral' : 'text-brand-purple'} ${fading(i) ? 'opacity-30' : ''}`}
          >
            {v}
          </button>
        ))}
      </div>
      <p className="font-body text-xs text-center mt-3 text-brand-black/60">Faded piece = disappears on the next move.</p>
      {win && (
        <Result
          tone={win.p === 'X' ? 'win' : 'lose'}
          emoji={win.p === 'X' ? '🏆' : '🤖'}
          title={win.p === 'X' ? 'YOU WIN!' : 'COMPUTER WINS'}
          points={points}
          onAgain={reset}
        />
      )}
      {!win && <Btn variant="light" className="w-full mt-4" onClick={reset}>RESTART</Btn>}
    </div>
  );
}
