'use client';

import { createContext, useContext, useEffect, useRef, useState, type ComponentProps } from 'react';
import { play as playSound } from '@/lib/sfx';
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

const LoadingBoardContext = createContext({ pits: Array<number>(12).fill(4), store: [0, 0] as [number, number], seat: 0 });

function AyoLoading() {
  const { pits, store, seat } = useContext(LoadingBoardContext);
  const top = seat === 0 ? [11, 10, 9, 8, 7, 6] : [5, 4, 3, 2, 1, 0];
  const bottom = seat === 0 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11];
  return <div role="status" aria-label="Loading Ayo board" style={{ position: 'relative', aspectRatio: '8.15 / 4.95', display: 'grid', alignContent: 'center', gap: 12, padding: '6% 8%', background: 'repeating-linear-gradient(2deg,#ad713f44 0 1px,transparent 1px 7px),linear-gradient(130deg,#e6ba7e,#b27a43)' }}>
    {[top, bottom].map((row, r) => <div key={r} style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 5 }}>
      {row.map(i => <span key={i} style={{ position: 'relative', borderRadius: '50%', background: '#82502c', boxShadow: 'inset 0 3px 5px #321a16aa', textAlign: 'center', color: '#fff1d5', padding: '6px 0', fontWeight: 800 }}>
        <span aria-hidden="true" style={{ display: 'block', height: 8, fontSize: 8, lineHeight: '8px', letterSpacing: -1, color: '#f6d8a5', overflow: 'hidden' }}>{'●'.repeat(Math.min(pits[i], 6))}</span>
        {pits[i]}
      </span>)}
    </div>)}
    {[1 - seat, seat].map((owner, side) => <span key={side} style={{ position: 'absolute', top: '28%', bottom: '28%', [side === 0 ? 'left' : 'right']: '1%', width: '6%', display: 'grid', placeItems: 'center', borderRadius: '50%', background: '#82502c', color: '#fff1d5', fontWeight: 800 }}>{store[owner]}</span>)}
  </div>;
}

const LoadedAyoBoard = dynamic(() => import('./ayo3d/AyoBoard3D'), { ssr: false, loading: AyoLoading });

function AyoBoard3D(props: ComponentProps<typeof LoadedAyoBoard>) {
  return <LoadingBoardContext.Provider value={{ pits: props.pits, store: props.store, seat: props.seat ?? 0 }}>
    <LoadedAyoBoard {...props} />
  </LoadingBoardContext.Provider>;
}

function useSowSound(s: State) {
  const collected = s.store[0] + s.store[1];
  const moves = s.moves;
  const previous = useRef({ moves, collected });
  useEffect(() => {
    if (moves > previous.current.moves) playSound(collected > previous.current.collected ? 'capture' : 'place');
    previous.current = { moves, collected };
  }, [moves, collected]);
}

// Ayo (Oware rules). Pits 0-5 are yours (left to right), 6-11 are the computer's.
// Seeds are sown counter-clockwise, so on screen the computer's row runs right to left.

export default function Ayo({ award }: { award: (n: number) => void }) {
  const [s, setS] = useState<State>(() => fresh(['You', 'Computer']));
  useSowSound(s);
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

  const reset = () => { setS(fresh(['You', 'Computer'])); setPoints(0); };
  const movable = s.turn === 0 && !over ? legalMoves(s, 0) : [];

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4 text-center font-display font-black uppercase">
        <div className={`p-3 poster-border ${s.turn === 0 && !over ? 'bg-brand-acid' : 'bg-white'}`}>{s.names[0]} · {s.store[0]}</div>
        <div className={`p-3 poster-border ${s.turn === 1 && !over ? 'bg-brand-purple text-brand-cream' : 'bg-white'}`}>{s.names[1]} · {s.store[1]}</div>
      </div>

      <div data-sfx="none" className="poster-border poster-shadow bg-amber-200">
        <AyoBoard3D
          pits={s.pits}
          store={s.store}
          turn={s.turn}
          seat={0}
          legalMoves={movable}
          onPitSelect={tap}
        />
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

export function AyoOnline({ view, seat, act }: {
  view: State;
  seat: number | null;
  names: string[];
  act: (a: { pit: number }) => Promise<void>;
}) {
  const [err, setErr] = useState('');

  const s = view;
  useSowSound(s);
  const over = finished(s);
  const mine = seat ?? 0;
  const turn = s.turn;
  const yourTurn = seat !== null && !over && turn === seat;
  const movable = yourTurn && seat !== null ? legalMoves(s, seat as 0 | 1) : [];

  const otherSeat = seat === null ? 1 : seat === 0 ? 1 : 0;

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

  return (
    <div>
      <p className="mb-2 font-body text-xs text-center text-brand-black/60">
        Seeds: you {s.store[mine]} · them {s.store[otherSeat]} · First to {WIN_AT}.
      </p>
      <div data-online-board="ayo" data-sfx="none" className="poster-border poster-shadow bg-amber-200">
        <AyoBoard3D
          pits={s.pits}
          store={s.store}
          turn={s.turn}
          seat={seat}
          legalMoves={movable}
          onPitSelect={(pit) => void tap(pit)}
        />
      </div>

      {err !== '' && !over && (
        <p className="font-body text-sm text-center text-brand-purple mt-1">{err}</p>
      )}
    </div>
  );
}