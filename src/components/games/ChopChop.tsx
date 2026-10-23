'use client';

import { useState } from 'react';
import { Btn, Result } from '@/components/arcade/ui';
import { play } from '@/lib/sfx';

const N = 7;
const MOVES = 20;
const GOAL = 300;
const SNACKS = [
  { e: '🍢', name: 'Suya' },
  { e: '🍩', name: 'Puff-puff' },
  { e: '🌭', name: 'Sausage roll' },
  { e: '🥜', name: 'Groundnut' },
  { e: '🍌', name: 'Plantain' },
  { e: '🍊', name: 'Agbalumo' },
];
type Grid = number[][];

const rnd = () => Math.floor(Math.random() * SNACKS.length);

function matches(g: Grid): boolean[][] {
  const hit = Array.from({ length: N }, () => Array(N).fill(false));
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const v = g[r][c];
      if (v < 0) continue;
      if (c + 2 < N && g[r][c + 1] === v && g[r][c + 2] === v) { hit[r][c] = hit[r][c + 1] = hit[r][c + 2] = true; }
      if (r + 2 < N && g[r + 1][c] === v && g[r + 2][c] === v) { hit[r][c] = hit[r + 1][c] = hit[r + 2][c] = true; }
    }
  }
  return hit;
}

// Clears matches, drops tiles, refills, repeats. Returns the new grid and points.
function settle(grid: Grid): { grid: Grid; gained: number; chain: number } {
  const g = grid.map(r => [...r]);
  let gained = 0;
  let chain = 0;
  for (;;) {
    const hit = matches(g);
    const count = hit.flat().filter(Boolean).length;
    if (count === 0) break;
    chain++;
    gained += count * 10 * chain;
    for (let c = 0; c < N; c++) {
      const col: number[] = [];
      for (let r = N - 1; r >= 0; r--) if (!hit[r][c]) col.push(g[r][c]);
      while (col.length < N) col.push(rnd());
      for (let r = 0; r < N; r++) g[r][c] = col[N - 1 - r];
    }
  }
  return { grid: g, gained, chain };
}

function swapped(g: Grid, a: [number, number], b: [number, number]): Grid {
  const n = g.map(r => [...r]);
  [n[a[0]][a[1]], n[b[0]][b[1]]] = [n[b[0]][b[1]], n[a[0]][a[1]]];
  return n;
}

function hasMove(g: Grid): boolean {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (c + 1 < N && matches(swapped(g, [r, c], [r, c + 1])).flat().some(Boolean)) return true;
      if (r + 1 < N && matches(swapped(g, [r, c], [r + 1, c])).flat().some(Boolean)) return true;
    }
  }
  return false;
}

function newBoard(): Grid {
  for (;;) {
    const g = Array.from({ length: N }, () => Array.from({ length: N }, rnd));
    const { grid } = settle(g);
    if (hasMove(grid)) return grid;
  }
}

export default function ChopChop({ award }: { award: (n: number) => void }) {
  const [grid, setGrid] = useState<Grid>(newBoard);
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(MOVES);
  const [msg, setMsg] = useState('');
  const [points, setPoints] = useState(0);

  const over = moves <= 0;
  const reached = score >= GOAL;

  const tap = (r: number, c: number) => {
    if (over) return;
    if (!sel) { play('tap'); setSel([r, c]); return; }
    const [sr, sc] = sel;
    if (sr === r && sc === c) { play('tap'); setSel(null); return; }
    if (Math.abs(sr - r) + Math.abs(sc - c) !== 1) { play('tap'); setSel([r, c]); return; }
    const test = swapped(grid, sel, [r, c]);
    if (!matches(test).flat().some(Boolean)) {
      play('error');
      setMsg('No match there — try another swap.');
      setSel(null);
      return;
    }
    const res = settle(test);
    play('capture');
    let next = res.grid;
    let note = res.chain > 1 ? `Chain x${res.chain}! +${res.gained}` : `+${res.gained}`;
    if (!hasMove(next)) {
      next = newBoard();
      note += ' · Board shuffled';
    }
    const total = score + res.gained;
    const left = moves - 1;
    setGrid(next);
    setScore(total);
    setMoves(left);
    setSel(null);
    setMsg(note);
    if (left <= 0) {
      const pts = total >= GOAL ? 50 + Math.floor((total - GOAL) / 10) : Math.floor(total / 10);
      award(pts);
      setPoints(pts);
    }
  };

  const reset = () => {
    setGrid(newBoard()); setSel(null); setScore(0); setMoves(MOVES); setMsg(''); setPoints(0);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-4 text-center font-display font-black uppercase">
        <div className="p-2 poster-border bg-white">SCORE {score}</div>
        <div className={`p-2 poster-border ${reached ? 'bg-brand-acid' : 'bg-white'}`}>GOAL {GOAL}</div>
        <div className="p-2 poster-border bg-white">MOVES {moves}</div>
      </div>

      <div data-sfx="none" className="grid grid-cols-7 gap-1 p-2 poster-border poster-shadow bg-brand-black">
        {grid.map((row, r) =>
          row.map((v, c) => (
            <button
              key={`${r}-${c}`}
              onClick={() => tap(r, c)}
              aria-label={`${SNACKS[v].name} row ${r + 1} column ${c + 1}`}
              className={`aspect-square flex items-center justify-center text-[clamp(20px,6vw,32px)] bg-brand-cream ${
                sel && sel[0] === r && sel[1] === c ? 'ring-4 ring-brand-purple scale-110' : ''
              }`}
            >
              {SNACKS[v].e}
            </button>
          ))
        )}
      </div>

      <p className="font-body text-sm text-center mt-3 min-h-5">{msg || 'Tap a snack, then a neighbour, to swap. Match 3 or more.'}</p>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 font-body text-xs text-brand-black/60">
        {SNACKS.map(s => (
          <span key={s.name}>{s.e} {s.name}</span>
        ))}
      </div>

      {over && (
        <Result
          tone={reached ? 'win' : 'lose'}
          emoji={reached ? '🏆' : '🍽️'}
          title={reached ? 'FEAST COMPLETE!' : 'OUT OF MOVES'}
          detail={`You scored ${score}. ${reached ? '' : `Goal was ${GOAL}.`}`}
          points={points}
          onAgain={reset}
        />
      )}
      {!over && <Btn variant="light" className="w-full mt-4" onClick={reset}>NEW BOARD</Btn>}
    </div>
  );
}
