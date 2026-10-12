'use client';

import { useEffect, useState } from 'react';
import { Btn, Result } from '@/components/arcade/ui';

// Ayo (Oware rules). Pits 0-5 are yours (left to right), 6-11 are the computer's.
// Seeds are sown counter-clockwise, so on screen the computer's row runs right to left.
const WIN_AT = 25;
const MOVE_CAP = 200;

interface State {
  pits: number[];
  store: [number, number]; // [you, computer]
  turn: 0 | 1;
  moves: number;
  last: number | null;
  note: string;
}

const fresh = (): State => ({ pits: Array(12).fill(4), store: [0, 0], turn: 0, moves: 0, last: null, note: '' });

const owner = (i: number): 0 | 1 => (i < 6 ? 0 : 1);
const sideRange = (p: 0 | 1) => (p === 0 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11]);
const seedsOn = (pits: number[], p: 0 | 1) => sideRange(p).reduce((a, i) => a + pits[i], 0);

// Applies a sow + capture. Returns null if the move is not allowed.
function sow(s: State, pit: number): { pits: number[]; gain: number; last: number } | null {
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

function legalMoves(s: State, p: 0 | 1): number[] {
  const mine = sideRange(p).filter(i => s.pits[i] > 0);
  if (seedsOn(s.pits, p === 0 ? 1 : 0) > 0) return mine;
  // Opponent has nothing: you must feed them if you can
  const feeding = mine.filter(i => {
    const r = sow(s, i);
    return r && seedsOn(r.pits, p === 0 ? 1 : 0) > 0;
  });
  return feeding;
}

function step(s: State, pit: number): State {
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
    note: r.gain ? `${p === 0 ? 'You' : 'Computer'} captured ${r.gain}!` : '',
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

function finished(s: State) {
  return s.store[0] >= WIN_AT || s.store[1] >= WIN_AT || s.pits.every(v => v === 0) || s.moves >= MOVE_CAP;
}

function aiPit(s: State): number {
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

export default function Ayo({ award }: { award: (n: number) => void }) {
  const [s, setS] = useState<State>(fresh);
  const [points, setPoints] = useState(0);

  const over = finished(s);
  const verdict = s.store[0] === s.store[1] ? 'draw' : s.store[0] > s.store[1] ? 'win' : 'lose';

  const settle = (next: State) => {
    if (!finished(next)) return;
    const pts = next.store[0] > next.store[1] ? 80 : next.store[0] === next.store[1] ? 30 : 0;
    award(pts);
    setPoints(pts);
  };

  const tap = (pit: number) => {
    if (s.turn !== 0 || over || owner(pit) !== 0) return;
    if (!legalMoves(s, 0).includes(pit)) return;
    const next = step(s, pit);
    setS(next);
    settle(next);
  };

  useEffect(() => {
    if (s.turn !== 1 || over) return;
    const t = window.setTimeout(() => {
      const next = step(s, aiPit(s));
      setS(next);
      settle(next);
    }, 700);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, over]);

  const reset = () => { setS(fresh()); setPoints(0); };
  const top = [11, 10, 9, 8, 7, 6];
  const bottom = [0, 1, 2, 3, 4, 5];
  const movable = s.turn === 0 && !over ? legalMoves(s, 0) : [];

  const pit = (i: number, mine: boolean) => (
    <button
      key={i}
      onClick={() => tap(i)}
      disabled={!mine}
      aria-label={`Pit ${i + 1}, ${s.pits[i]} seeds${mine ? '' : ', computer'}`}
      className={`aspect-square rounded-full border-4 border-brand-black flex items-center justify-center font-display font-black text-xl md:text-2xl ${
        s.last === i ? 'ring-4 ring-brand-purple' : ''
      } ${mine ? (movable.includes(i) ? 'bg-brand-acid hover:-translate-y-1 transition-transform' : 'bg-brand-acid/40') : 'bg-brand-purple/30'}`}
    >
      {s.pits[i]}
    </button>
  );

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4 text-center font-display font-black uppercase">
        <div className={`p-3 poster-border ${s.turn === 0 && !over ? 'bg-brand-acid' : 'bg-white'}`}>YOU · {s.store[0]}</div>
        <div className={`p-3 poster-border ${s.turn === 1 && !over ? 'bg-brand-purple text-brand-cream' : 'bg-white'}`}>COMPUTER · {s.store[1]}</div>
      </div>

      <div className="p-3 poster-border poster-shadow bg-amber-200">
        <div className="grid grid-cols-6 gap-2 mb-2">{top.map(i => pit(i, false))}</div>
        <div className="grid grid-cols-6 gap-2">{bottom.map(i => pit(i, true))}</div>
      </div>

      <p className="font-body text-sm text-center mt-3 min-h-5">
        {over ? '' : s.note || (s.turn === 0 ? 'Pick one of your pits (bottom row).' : 'Computer is choosing…')}
      </p>
      <p className="font-body text-xs text-center text-brand-black/60">
        Seeds go round counter-clockwise. Land your last seed in a pit that makes 2 or 3 and you capture it. First to {WIN_AT} wins.
      </p>

      {over && (
        <Result
          tone={verdict}
          emoji={verdict === 'win' ? '🏆' : verdict === 'draw' ? '🤝' : '🤖'}
          title={verdict === 'win' ? 'YOU WIN!' : verdict === 'draw' ? 'DRAW' : 'COMPUTER WINS'}
          detail={`${s.store[0]} to ${s.store[1]}`}
          points={points}
          onAgain={reset}
        />
      )}
      {!over && <Btn variant="light" className="w-full mt-4" onClick={reset}>RESTART</Btn>}
    </div>
  );
}
