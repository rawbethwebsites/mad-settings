'use client';

import { useEffect, useState } from 'react';
import { Btn, Result } from '@/components/arcade/ui';

const N = 4; // boxes per side
type Owner = 0 | 1 | 2;
interface State {
  h: boolean[][]; // (N+1) x N
  v: boolean[][]; // N x (N+1)
  box: Owner[][]; // N x N
  turn: 1 | 2;
}

const fresh = (): State => ({
  h: Array.from({ length: N + 1 }, () => Array(N).fill(false)),
  v: Array.from({ length: N }, () => Array(N + 1).fill(false)),
  box: Array.from({ length: N }, () => Array<Owner>(N).fill(0)),
  turn: 1,
});

type Line = { kind: 'h' | 'v'; r: number; c: number };

const sides = (s: State, r: number, c: number) =>
  [s.h[r][c], s.h[r + 1][c], s.v[r][c], s.v[r][c + 1]].filter(Boolean).length;

function apply(s: State, line: Line): State {
  const next: State = {
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

function freeLines(s: State): Line[] {
  const out: Line[] = [];
  for (let r = 0; r <= N; r++) for (let c = 0; c < N; c++) if (!s.h[r][c]) out.push({ kind: 'h', r, c });
  for (let r = 0; r < N; r++) for (let c = 0; c <= N; c++) if (!s.v[r][c]) out.push({ kind: 'v', r, c });
  return out;
}

const boxesOf = (s: State, l: Line): [number, number][] => {
  const out: [number, number][] = [];
  if (l.kind === 'h') {
    if (l.r > 0) out.push([l.r - 1, l.c]);
    if (l.r < N) out.push([l.r, l.c]);
  } else {
    if (l.c > 0) out.push([l.r, l.c - 1]);
    if (l.c < N) out.push([l.r, l.c]);
  }
  return out.filter(([r, c]) => r >= 0 && r < N && c >= 0 && c < N && s.box[r][c] === 0);
};

function aiLine(s: State): Line {
  const free = freeLines(s);
  const completes = free.filter(l => boxesOf(s, l).some(([r, c]) => sides(s, r, c) === 3));
  if (completes.length) return completes[Math.floor(Math.random() * completes.length)];
  const safe = free.filter(l => boxesOf(s, l).every(([r, c]) => sides(s, r, c) < 2));
  const pool = safe.length ? safe : free;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function DotsAndBoxes({ award }: { award: (n: number) => void }) {
  const [s, setS] = useState<State>(fresh);
  const [points, setPoints] = useState(0);

  const you = s.box.flat().filter(b => b === 1).length;
  const cpu = s.box.flat().filter(b => b === 2).length;
  const over = you + cpu === N * N;

  const settle = (next: State) => {
    const y = next.box.flat().filter(b => b === 1).length;
    const c = next.box.flat().filter(b => b === 2).length;
    if (y + c === N * N) {
      const pts = y > c ? 70 : y === c ? 25 : 0;
      award(pts);
      setPoints(pts);
    }
  };

  const tap = (line: Line) => {
    if (s.turn !== 1 || over || s[line.kind][line.r][line.c]) return;
    const next = apply(s, line);
    setS(next);
    settle(next);
  };

  useEffect(() => {
    if (s.turn !== 2 || over) return;
    const t = window.setTimeout(() => {
      const next = apply(s, aiLine(s));
      setS(next);
      settle(next);
    }, 450);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, over]);

  const reset = () => { setS(fresh()); setPoints(0); };
  const size = 2 * N + 1;
  const track = Array.from({ length: size }, (_, i) => (i % 2 === 0 ? '14px' : '1fr')).join(' ');

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4 text-center font-display font-black uppercase">
        <div className={`p-3 poster-border ${s.turn === 1 && !over ? 'bg-brand-acid' : 'bg-white'}`}>YOU · {you}</div>
        <div className={`p-3 poster-border ${s.turn === 2 && !over ? 'bg-brand-purple text-brand-cream' : 'bg-white'}`}>COMPUTER · {cpu}</div>
      </div>

      <div
        className="grid aspect-square w-full p-2 bg-white poster-border"
        style={{ gridTemplateColumns: track, gridTemplateRows: track }}
      >
        {Array.from({ length: size * size }, (_, k) => {
          const i = Math.floor(k / size), j = k % size;
          if (i % 2 === 0 && j % 2 === 0) return <span key={k} className="rounded-full bg-brand-black" />;
          if (i % 2 === 0) {
            const r = i / 2, c = (j - 1) / 2;
            const on = s.h[r][c];
            return (
              <button key={k} aria-label={`Horizontal line ${r + 1},${c + 1}`} onClick={() => tap({ kind: 'h', r, c })}
                className={`my-[3px] rounded-full ${on ? 'bg-brand-black' : 'bg-brand-black/10 hover:bg-brand-purple/60'}`} />
            );
          }
          if (j % 2 === 0) {
            const r = (i - 1) / 2, c = j / 2;
            const on = s.v[r][c];
            return (
              <button key={k} aria-label={`Vertical line ${r + 1},${c + 1}`} onClick={() => tap({ kind: 'v', r, c })}
                className={`mx-[3px] rounded-full ${on ? 'bg-brand-black' : 'bg-brand-black/10 hover:bg-brand-purple/60'}`} />
            );
          }
          const o = s.box[(i - 1) / 2][(j - 1) / 2];
          return (
            <span key={k} className={`flex items-center justify-center font-display font-black text-xl ${
              o === 1 ? 'bg-brand-acid' : o === 2 ? 'bg-brand-purple text-brand-cream' : ''
            }`}>
              {o === 1 ? 'Y' : o === 2 ? 'C' : ''}
            </span>
          );
        })}
      </div>
      <p className="font-body text-xs text-center mt-3 text-brand-black/60">Finish a box to take another turn.</p>

      {over && (
        <Result
          tone={you > cpu ? 'win' : you === cpu ? 'draw' : 'lose'}
          emoji={you > cpu ? '🏆' : you === cpu ? '🤝' : '🤖'}
          title={you > cpu ? 'YOU WIN!' : you === cpu ? 'DRAW' : 'COMPUTER WINS'}
          detail={`${you} boxes to ${cpu}`}
          points={points}
          onAgain={reset}
        />
      )}
      {!over && <Btn variant="light" className="w-full mt-4" onClick={reset}>RESTART</Btn>}
    </div>
  );
}
