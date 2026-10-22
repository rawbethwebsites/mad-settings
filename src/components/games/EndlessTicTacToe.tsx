'use client';

import { useEffect, useRef, useState } from 'react';
import { play as playSound } from '@/lib/sfx';
import { Btn, Result } from '@/components/arcade/ui';
import { fresh, place, winner, type P, type TttMatch, type TttState } from '@/lib/rules/tictactoe';
import type { OnlineProps } from '@/lib/rules/types';
import { TicTacToeBoard } from '@/components/boards/TicTacToeBoard';

function usePlacementSound(cells: TttState['cells']) {
  const previous = useRef(cells);
  useEffect(() => {
    // A fourth piece removes an old one: detect additions, not piece count.
    if (cells.some((cell, i) => cell !== null && previous.current[i] === null)) playSound('place');
    previous.current = cells;
  }, [cells]);
}

function aiMove(s: TttState): number {
  const empty = s.cells.map((v, i) => (v ? -1 : i)).filter(i => i >= 0);
  for (const i of empty) if (winner(place(s, 'O', i).cells)?.p === 'O') return i;
  for (const i of empty) if (winner(place(s, 'X', i).cells)?.p === 'X') return i;
  const pref = [4, 0, 2, 6, 8, 1, 3, 5, 7].filter(i => empty.includes(i));
  // Mostly sensible, a little random so it isn't always the same game
  return Math.random() < 0.75 ? pref[0] : pref[Math.floor(Math.random() * pref.length)];
}

export default function EndlessTicTacToe({ award }: { award: (n: number) => void }) {
  const [s, setS] = useState<TttState>(fresh);
  const [turn, setTurn] = useState<P>('X');
  const [win, setWin] = useState<{ p: P; line: number[] } | null>(null);
  const [points, setPoints] = useState(0);
  usePlacementSound(s.cells);

  const after = (next: TttState, mover: P) => {
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

  return (
    <div>
      <p className="font-body text-center mb-4">
        Only <b>3 pieces</b> each. Place a 4th and your oldest one disappears. Get 3 in a row!
      </p>
      <div className={`mb-4 p-3 poster-border text-center font-display font-black uppercase ${turn === 'X' && !win ? 'bg-brand-acid' : 'bg-white'}`}>
        {win ? 'GAME OVER' : turn === 'X' ? 'YOUR TURN' : 'COMPUTER IS THINKING…'}
      </div>
      <div data-sfx="none"><TicTacToeBoard cells={s.cells} queue={s.queue} active={turn} win={win} onTap={tap} enabled={turn === 'X' && !win} /></div>
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

function Board({
  cells,
  queue,
  active,
  win,
  enabled,
  onTap,
}: {
  cells: (P | null)[];
  queue: Record<P, number[]>;
  active: P | null;
  win: { p: P; line: number[] } | null;
  enabled: boolean;
  onTap: (i: number) => void;
}) {
  // The piece that vanishes on the next placement for whoever is up
  const fading = (i: number) => !win && active !== null && queue[active].length === 3 && queue[active][0] === i;
  return (
    <div className="grid grid-cols-3 gap-2 aspect-square">
      {cells.map((v, i) => (
        <button
          key={i}
          onClick={() => onTap(i)}
          disabled={!enabled}
          aria-label={`Square ${i + 1}${v ? ` ${v}` : ''}`}
          className={`poster-border font-display font-black text-6xl flex items-center justify-center disabled:cursor-default ${
            win?.line.includes(i) ? 'bg-brand-acid' : 'bg-white'
          } ${v === 'X' ? 'text-brand-coral' : 'text-brand-purple'} ${fading(i) ? 'opacity-30' : ''}`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

// Online: seat 0 plays X (always your colour = X on your screen as "you").
export function TicTacToeOnline({ view, seat, names, act }: OnlineProps<TttMatch, { cell: number }>) {
  const [err, setErr] = useState('');
  usePlacementSound(view.cells);
  const win = winner(view.cells);
  const yourTurn = seat !== null && !win && view.turn === seat;
  const active: P | null = view.turn === 0 ? 'X' : 'O';

  const me = seat !== null ? names[seat] : null;
  const opp = seat !== null ? names[seat === 0 ? 1 : 0] : null;

  const tap = async (cell: number) => {
    if (!yourTurn || view.cells[cell]) return;
    setErr('');
    try {
      await act({ cell });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg.replace(/^Uncaught Error: /, '').split('\n')[0]);
    }
  };

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2 text-center font-display font-black uppercase text-sm">
        <div className={`p-3 poster-border ${view.turn === seat && !win ? 'bg-brand-acid' : 'bg-white'}`}>
          {me ?? 'RED'} · <span className="text-brand-coral">X</span>
        </div>
        <div className={`p-3 poster-border ${seat !== null && view.turn !== seat && !win ? 'bg-brand-purple text-brand-cream' : 'bg-white'}`}>
          {opp ?? 'THEM'} · <span className="text-brand-purple">O</span>
        </div>
      </div>
      <div className={`mb-4 p-3 poster-border text-center font-display font-black uppercase ${yourTurn ? 'bg-brand-acid' : 'bg-white'}`} aria-live="polite">
        {win ? 'GAME OVER' : yourTurn ? 'YOUR TURN' : `${opp ?? 'THEY'} IS PLAYING…`}
      </div>
      <div data-sfx="none"><TicTacToeBoard
        cells={view.cells}
        queue={view.queue}
        active={yourTurn ? active : null}
        win={win}
        onTap={tap}
        enabled={yourTurn}
      /></div>
      <p className="font-body text-xs text-center mt-3 text-brand-black/60">Faded piece = disappears on the next move.</p>
      {err && (
        <div role="alert" className="mt-3 p-3 poster-border bg-brand-coral font-display font-bold text-sm text-center">
          {err}
        </div>
      )}
    </div>
  );
}
