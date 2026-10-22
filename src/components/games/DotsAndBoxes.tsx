'use client';

import { useEffect, useState } from 'react';
import { Btn, Result } from '@/components/arcade/ui';
import {
  N,
  apply,
  boxCount,
  fresh,
  freeLines,
  sides,
  type DotsState,
  type Line,
} from '@/lib/rules/dots';
import type { OnlineProps } from '@/lib/rules/types';

const boxesOf = (s: DotsState, l: Line): [number, number][] => {
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

function aiLine(s: DotsState): Line {
  const free = freeLines(s);
  const completes = free.filter(l => boxesOf(s, l).some(([r, c]) => sides(s, r, c) === 3));
  if (completes.length) return completes[Math.floor(Math.random() * completes.length)];
  const safe = free.filter(l => boxesOf(s, l).every(([r, c]) => sides(s, r, c) < 2));
  const pool = safe.length ? safe : free;
  return pool[Math.floor(Math.random() * pool.length)];
}

function Grid({
  s,
  marks,
  enabled,
  onTap,
}: {
  s: DotsState;
  // [mine, theirs] box letters shown on the board
  marks: [string, string];
  enabled: boolean;
  onTap: (line: Line) => void;
}) {
  const size = 2 * N + 1;
  const track = Array.from({ length: size }, (_, i) => (i % 2 === 0 ? '14px' : '1fr')).join(' ');
  return (
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
            <button
              key={k}
              aria-label={`Horizontal line ${r + 1},${c + 1}`}
              disabled={!enabled || on}
              onClick={() => onTap({ kind: 'h', r, c })}
              className={`my-[3px] rounded-full ${
                on ? 'bg-brand-black' : enabled ? 'bg-brand-black/10 hover:bg-brand-purple/60' : 'bg-brand-black/10'
              }`}
            />
          );
        }
        if (j % 2 === 0) {
          const r = (i - 1) / 2, c = j / 2;
          const on = s.v[r][c];
          return (
            <button
              key={k}
              aria-label={`Vertical line ${r + 1},${c + 1}`}
              disabled={!enabled || on}
              onClick={() => onTap({ kind: 'v', r, c })}
              className={`mx-[3px] rounded-full ${
                on ? 'bg-brand-black' : enabled ? 'bg-brand-black/10 hover:bg-brand-purple/60' : 'bg-brand-black/10'
              }`}
            />
          );
        }
        const o = s.box[(i - 1) / 2][(j - 1) / 2];
        return (
          <span
            key={k}
            className={`flex items-center justify-center font-display font-black text-xl ${
              o === 1 ? 'bg-brand-acid' : o === 2 ? 'bg-brand-purple text-brand-cream' : ''
            }`}
          >
            {o === 1 ? marks[0] : o === 2 ? marks[1] : ''}
          </span>
        );
      })}
    </div>
  );
}

export default function DotsAndBoxes({ award }: { award: (n: number) => void }) {
  const [s, setS] = useState<DotsState>(fresh);
  const [points, setPoints] = useState(0);

  const you = boxCount(s, 1);
  const cpu = boxCount(s, 2);
  const over = you + cpu === N * N;

  const settle = (next: DotsState) => {
    const y = boxCount(next, 1);
    const c = boxCount(next, 2);
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

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4 text-center font-display font-black uppercase">
        <div className={`p-3 poster-border ${s.turn === 1 && !over ? 'bg-brand-acid' : 'bg-white'}`}>YOU · {you}</div>
        <div className={`p-3 poster-border ${s.turn === 2 && !over ? 'bg-brand-purple text-brand-cream' : 'bg-white'}`}>COMPUTER · {cpu}</div>
      </div>

      <Grid s={s} marks={['Y', 'C']} enabled={s.turn === 1 && !over} onTap={tap} />
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

// Online: seat 0 owns boxes 1 ("Y"), seat 1 owns boxes 2. Your mark is always Y.
export function DotsOnline({ view, seat, names, act }: OnlineProps<DotsState, Line>) {
  const [err, setErr] = useState('');
  const mine = boxCount(view, 1);
  const theirs = boxCount(view, 2);
  const over = mine + theirs === N * N;
  const yourTurn = seat !== null && !over && view.turn === seat + 1;

  const me = seat !== null ? names[seat] : null;
  const opp = seat !== null ? names[seat === 0 ? 1 : 0] : null;

  // The server view is from seat 0's angle: boxes are 1/2 by seat index.
  // Flip when you are seat 1 so "you" is always the acid Y boxes on screen.
  let shown = view;
  if (seat === 1) {
    shown = {
      ...view,
      box: view.box.map(row => row.map(b => (b === 1 ? 2 : b === 2 ? 1 : b))),
    };
  }
  const yourBoxes = seat === 1 ? theirs : mine;
  const theirBoxes = seat === 1 ? mine : theirs;

  const tap = async (line: Line) => {
    if (!yourTurn) return;
    setErr('');
    try {
      await act(line);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg.replace(/^Uncaught Error: /, '').split('\n')[0]);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4 text-center font-display font-black uppercase">
        <div className={`p-3 poster-border ${yourTurn ? 'bg-brand-acid' : 'bg-white'}`}>{me ?? 'YOU'} · {yourBoxes}</div>
        <div className={`p-3 poster-border ${!yourTurn && !over ? 'bg-brand-purple text-brand-cream' : 'bg-white'}`}>{opp ?? 'THEM'} · {theirBoxes}</div>
      </div>

      <Grid s={shown} marks={['Y', 'T']} enabled={yourTurn} onTap={tap} />
      <p className="font-body text-xs text-center mt-3 text-brand-black/60">Finish a box to take another turn.</p>

      {err && (
        <div role="alert" className="mt-3 p-3 poster-border bg-brand-coral font-display font-bold text-sm text-center">
          {err}
        </div>
      )}
    </div>
  );
}
