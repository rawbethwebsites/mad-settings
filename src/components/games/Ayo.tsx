'use client';

import { useEffect, useState, Suspense } from 'react';
import { Btn, Result } from '@/components/arcade/ui';
import {
  WIN_AT,
  type State,
  fresh,
  owner,
  legalMoves,
  step,
  finished,
  aiPit,
} from '@/lib/rules/ayo';

import dynamic from 'next/dynamic';

const AyoBoard3D = dynamic(() => import('./ayo3d/AyoBoard3D'), { ssr: false });

// Ayo (Oware rules). Pits 0-5 are yours (left to right), 6-11 are the computer's.
// Seeds are sown counter-clockwise, so on screen the computer's row runs right to left.

export default function Ayo({ award }: { award: (n: number) => void }) {
  const [s, setS] = useState<State>(() => fresh(['You', 'Computer']));
  const [points, setPoints] = useState(0);
  const [webglOk] = useState(true);

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

  const reset = () => { setS(fresh(['You', 'Computer'])); setPoints(0); };
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
        <div className={`p-3 poster-border ${s.turn === 0 && !over ? 'bg-brand-acid' : 'bg-white'}`}>{s.names[0]} · {s.store[0]}</div>
        <div className={`p-3 poster-border ${s.turn === 1 && !over ? 'bg-brand-purple text-brand-cream' : 'bg-white'}`}>{s.names[1]} · {s.store[1]}</div>
      </div>

      <div className="p-3 poster-border poster-shadow bg-amber-200">
        <Suspense fallback={<div className="grid grid-cols-6 gap-2 mb-2">{top.map(i => pit(i, false))}</div>}>
          {webglOk ? (
            <AyoBoard3D
              pits={s.pits}
              store={s.store}
              turn={s.turn}
              seat={0}
              legalMoves={movable}
              onPitSelect={tap}
            />
          ) : (
            <>
              <div className="grid grid-cols-6 gap-2 mb-2">{top.map(i => pit(i, false))}</div>
              <div className="grid grid-cols-6 gap-2">{bottom.map(i => pit(i, true))}</div>
            </>
          )}
        </Suspense>
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

export function AyoOnline({ view, seat, names, act }: {
  view: State;
  seat: number | null;
  names: string[];
  act: (a: { pit: number }) => Promise<void>;
}) {
  const [err, setErr] = useState('');

  const s = view;
  const over = finished(s);
  const mine = seat ?? 0;
  const turn = s.turn;
  const yourTurn = seat !== null && !over && turn === seat;
  const movable = yourTurn && seat !== null ? legalMoves(s, seat as 0 | 1) : [];
  const watching = seat === null;

  const top = mine === 0 ? [11, 10, 9, 8, 7, 6] : [5, 4, 3, 2, 1, 0];

  const yourName = seat !== null ? (names[seat] ?? `Seat ${seat + 1}`) : 'You';
  const otherSeat = seat === null ? 1 : seat === 0 ? 1 : 0;
  const otherName = names[otherSeat] ?? `Seat ${otherSeat + 1}`;

  const tap = async (pit: number) => {
    setErr('');
    try {
      await act({ pit });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      let clean = msg.replace(/^Uncaught Error: /, '');
      clean = clean.split('\n')[0];
      setErr(clean);
    }
  };

  const pit = (i: number, myPit: boolean) => (
    <button
      key={i}
      onClick={() => { if (myPit && yourTurn && movable.includes(i)) void tap(i); }}
      disabled={!myPit || !movable.includes(i)}
      aria-label={`Pit ${i + 1}, ${s.pits[i]} seeds${myPit ? '' : ', opponent'}`}
      className={`aspect-square rounded-full border-4 border-brand-black flex items-center justify-center font-display font-black text-xl md:text-2xl ${
        s.last === i ? 'ring-4 ring-brand-purple' : ''
      } ${myPit ? (movable.includes(i) ? 'bg-brand-acid hover:-translate-y-1 transition-transform' : 'bg-brand-acid/40') : 'bg-brand-purple/30'}`}
    >
      {s.pits[i]}
    </button>
  );

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4 text-center font-display font-black uppercase">
        <div className={`p-3 poster-border ${!over && turn === mine ? 'bg-brand-acid' : 'bg-white'}`}>{yourName} · {s.store[mine]}</div>
        <div className={`p-3 poster-border ${!over && turn === otherSeat ? 'bg-brand-purple text-brand-cream' : 'bg-white'}`}>{otherName} · {s.store[otherSeat]}</div>
      </div>

      <div className="p-3 poster-border poster-shadow bg-amber-200">
        <Suspense fallback={<div className="grid grid-cols-6 gap-2">{top.map(i => pit(i, false))}</div>}>
          <AyoBoard3D
            pits={s.pits}
            store={s.store}
            turn={s.turn}
            seat={mine}
            legalMoves={movable}
            onPitSelect={(pit) => void tap(pit)}
          />
        </Suspense>
      </div>

      <p className="font-body text-sm text-center mt-3 min-h-5">
        {over
          ? ''
          : s.note ||
            (watching
              ? 'Watching the room…'
              : yourTurn
                ? 'Your turn — pick one of your pits (bottom row).'
                : 'Waiting for the other player…')}
      </p>
      {err !== '' && !over && (
        <p className="font-body text-sm text-center text-brand-purple mt-1">{err}</p>
      )}
      <p className="font-body text-xs text-center text-brand-black/60">
        Seeds go round counter-clockwise. Land your last seed in a pit that makes 2 or 3 and you capture it. First to {WIN_AT} wins.
      </p>
    </div>
  );
}