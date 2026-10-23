'use client';

import { useEffect, useState } from 'react';
import { Btn, Result } from '@/components/arcade/ui';
import { play } from '@/lib/sfx';

const N = 9;
const MINES = 10;

interface Cell {
  mine: boolean;
  adj: number;
  open: boolean;
  flag: boolean;
}
type Grid = Cell[][];

const blank = (): Grid =>
  Array.from({ length: N }, () => Array.from({ length: N }, () => ({ mine: false, adj: 0, open: false, flag: false })));

const near = (r: number, c: number) => {
  const out: [number, number][] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if ((dr || dc) && rr >= 0 && rr < N && cc >= 0 && cc < N) out.push([rr, cc]);
    }
  }
  return out;
};

// First tap is always safe: mines are placed after it, away from that square
function plant(grid: Grid, safeR: number, safeC: number): Grid {
  const g = grid.map(row => row.map(c => ({ ...c })));
  const banned = new Set([`${safeR},${safeC}`, ...near(safeR, safeC).map(([r, c]) => `${r},${c}`)]);
  let placed = 0;
  while (placed < MINES) {
    const r = Math.floor(Math.random() * N), c = Math.floor(Math.random() * N);
    if (g[r][c].mine || banned.has(`${r},${c}`)) continue;
    g[r][c].mine = true;
    placed++;
  }
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) g[r][c].adj = near(r, c).filter(([a, b]) => g[a][b].mine).length;
  return g;
}

function flood(grid: Grid, r: number, c: number): Grid {
  const g = grid.map(row => row.map(cell => ({ ...cell })));
  const stack: [number, number][] = [[r, c]];
  while (stack.length) {
    const [cr, cc] = stack.pop() as [number, number];
    const cell = g[cr][cc];
    if (cell.open || cell.flag) continue;
    cell.open = true;
    if (cell.adj === 0 && !cell.mine) stack.push(...near(cr, cc));
  }
  return g;
}

const NUM_COLOR = ['', 'text-blue-600', 'text-green-700', 'text-red-600', 'text-purple-800', 'text-amber-700', 'text-cyan-700', 'text-black', 'text-gray-600'];

export default function Minesweeper({ award }: { award: (n: number) => void }) {
  const [grid, setGrid] = useState<Grid>(blank);
  const [started, setStarted] = useState(false);
  const [state, setState] = useState<'play' | 'won' | 'lost'>('play');
  const [flagMode, setFlagMode] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    if (!started || state !== 'play') return;
    const t = window.setInterval(() => setSeconds(s => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [started, state]);

  const flags = grid.flat().filter(c => c.flag).length;

  const tap = (r: number, c: number) => {
    if (state !== 'play') return;
    let g = grid;
    if (flagMode) {
      if (g[r][c].open) return;
      play('place');
      g = g.map(row => row.map(cell => ({ ...cell })));
      g[r][c].flag = !g[r][c].flag;
      setGrid(g);
      return;
    }
    if (g[r][c].flag || g[r][c].open) return;
    if (!started) {
      g = plant(g, r, c);
      setStarted(true);
    }
    if (g[r][c].mine) {
      const shown = g.map(row => row.map(cell => (cell.mine ? { ...cell, open: true } : cell)));
      setGrid(shown);
      setState('lost');
      return;
    }
    g = flood(g, r, c);
    if (!g.flat().every(cell => cell.mine || cell.open)) play('flip');
    setGrid(g);
    if (g.flat().every(cell => cell.mine || cell.open)) {
      const pts = 80 + Math.max(0, Math.floor((120 - seconds) / 2));
      award(pts);
      setPoints(pts);
      setState('won');
    }
  };

  const reset = () => {
    setGrid(blank());
    setStarted(false);
    setState('play');
    setSeconds(0);
    setPoints(0);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-4 text-center font-display font-black uppercase">
        <div className="p-2 poster-border bg-white">💣 {MINES - flags}</div>
        <button
          onClick={() => setFlagMode(f => !f)}
          aria-pressed={flagMode}
          className={`p-2 poster-border ${flagMode ? 'bg-brand-coral' : 'bg-white'}`}
        >
          {flagMode ? '🚩 FLAGGING' : '👆 DIGGING'}
        </button>
        <div className="p-2 poster-border bg-white">⏱ {seconds}s</div>
      </div>

      <div data-sfx="none" className="grid grid-cols-9 gap-[2px] p-1 bg-brand-black poster-shadow">
        {grid.map((row, r) =>
          row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              onClick={() => tap(r, c)}
              aria-label={`Row ${r + 1} column ${c + 1}${cell.open ? (cell.mine ? ' mine' : ` ${cell.adj}`) : cell.flag ? ' flagged' : ' hidden'}`}
              className={`aspect-square flex items-center justify-center font-display font-black text-sm md:text-lg ${
                cell.open ? (cell.mine ? 'bg-brand-coral' : 'bg-brand-cream') : 'bg-brand-acid'
              } ${NUM_COLOR[cell.adj]}`}
            >
              {cell.open ? (cell.mine ? '💣' : cell.adj || '') : cell.flag ? '🚩' : ''}
            </button>
          ))
        )}
      </div>
      <p className="font-body text-xs text-center mt-3 text-brand-black/60">
        Numbers show how many mines touch a square. Switch to flag mode to mark a mine.
      </p>

      {state !== 'play' && (
        <Result
          tone={state === 'won' ? 'win' : 'lose'}
          emoji={state === 'won' ? '🏆' : '💥'}
          title={state === 'won' ? 'FIELD CLEARED!' : 'BOOM!'}
          detail={state === 'won' ? `Cleared in ${seconds} seconds.` : 'You hit a mine.'}
          points={points}
          onAgain={reset}
        />
      )}
      {state === 'play' && <Btn variant="light" className="w-full mt-4" onClick={reset}>NEW FIELD</Btn>}
    </div>
  );
}
