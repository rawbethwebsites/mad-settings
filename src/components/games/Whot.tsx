'use client';

import { useEffect, useState } from 'react';
import { Btn, Label, Panel, Result } from '@/components/arcade/ui';
import type { OnlineProps } from '@/lib/rules/types';
import {
  aiTurn,
  canPlay,
  deal,
  draw,
  GLYPH,
  playCard,
  SHAPES,
  top,
  type Card,
  type Shape,
  type State,
  type WhotAction,
  type WhotView,
} from '@/lib/rules/whot';

const TINT: Record<Shape, string> = {
  circle: 'text-red-600',
  triangle: 'text-blue-600',
  cross: 'text-green-700',
  square: 'text-amber-600',
  star: 'text-purple-700',
};

export function Face({ c, size = 'md' }: { c: Card; size?: 'md' | 'lg' }) {
  const big = size === 'lg';
  return (
    <span
      className={`flex flex-col items-center justify-center bg-white border-2 border-brand-black font-display font-black leading-none ${
        big ? 'w-20 h-28 text-3xl' : 'w-12 h-[4.5rem] text-lg'
      } ${c.shape === 'whot' ? 'text-brand-black' : TINT[c.shape]}`}
    >
      {c.shape === 'whot' ? (
        <>
          <span>W</span>
          <span className={big ? 'text-sm' : 'text-[10px]'}>20</span>
        </>
      ) : (
        <>
          <span>{c.n}</span>
          <span>{GLYPH[c.shape]}</span>
        </>
      )}
    </span>
  );
}

export default function Whot({ award }: { award: (n: number) => void }) {
  const [opponents, setOpponents] = useState(1);
  const [s, setS] = useState<State | null>(null);
  const [picking, setPicking] = useState<number | null>(null);
  const [points, setPoints] = useState(0);

  const settle = (next: State) => {
    if (next.winner === null) return;
    const pts = next.winner === 0 ? 40 + opponents * 20 : 0;
    award(pts);
    setPoints(pts);
  };

  useEffect(() => {
    if (!s || s.winner !== null || s.turn === 0) return;
    const t = window.setTimeout(() => {
      const next = aiTurn(s);
      setS(next);
      settle(next);
    }, 900);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);

  if (!s) {
    return (
      <Panel>
        <p className="font-body text-lg mb-4">
          Nigeria&apos;s favourite card game. Match the shape or number and empty your hand first.
        </p>
        <ul className="font-body text-sm mb-5 space-y-1 list-disc pl-5">
          <li><b>1</b> Hold on — play again</li>
          <li><b>2</b> Pick two · <b>5</b> Pick three</li>
          <li><b>8</b> Suspension — next player misses a turn</li>
          <li><b>14</b> General market — everyone else picks one</li>
          <li><b>WHOT 20</b> — wild, you choose the shape</li>
        </ul>
        <Label>OPPONENTS</Label>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[1, 2, 3].map(n => (
            <Btn key={n} variant={opponents === n ? 'primary' : 'light'} onClick={() => setOpponents(n)}>{n}</Btn>
          ))}
        </div>
        <Btn className="w-full" onClick={() => setS(deal(['You', ...Array.from({ length: opponents }, (_, k) => `Computer ${k + 1}`)]))}>DEAL →</Btn>
      </Panel>
    );
  }

  const myTurn = s.turn === 0 && s.winner === null;
  const t = top(s);

  const tap = (i: number) => {
    if (!myTurn) return;
    const c = s.hands[0][i];
    if (!canPlay(s, c)) return;
    if (c.shape === 'whot') { setPicking(i); return; }
    const next = playCard(s, 0, i, null);
    setS(next);
    settle(next);
  };

  const chooseShape = (shape: Shape) => {
    if (picking === null) return;
    const next = playCard(s, 0, picking, shape);
    setPicking(null);
    setS(next);
    settle(next);
  };

  const market = () => {
    if (!myTurn) return;
    setS(draw(s, 0));
  };

  const reset = () => { setS(null); setPicking(null); setPoints(0); };
  const name = (p: number) => s.names[p];

  return (
    <div>
      <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${s.hands.length - 1}, minmax(0, 1fr))` }}>
        {s.hands.slice(1).map((h, k) => (
          <div key={k} className={`p-2 poster-border text-center font-display font-black uppercase text-xs ${s.turn === k + 1 && s.winner === null ? 'bg-brand-purple text-brand-cream' : 'bg-white'}`}>
            {name(k + 1)}<div className="text-xl">🂠 {h.length}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-6 p-4 poster-border poster-shadow bg-emerald-800 mb-3">
        <button onClick={market} disabled={!myTurn} aria-label="Go to market and draw a card"
          className="w-20 h-28 poster-border bg-brand-purple text-brand-cream font-display font-black text-xs uppercase disabled:opacity-60 hover:-translate-y-1 transition-transform">
          MARKET<br />{s.market.length}
        </button>
        <div className="text-center">
          <Face c={t} size="lg" />
          {s.want && (
            <div className="mt-1 px-2 py-0.5 bg-white font-display font-black text-sm">{GLYPH[s.want]} {s.want.toUpperCase()}</div>
          )}
        </div>
      </div>

      <p className="font-body text-sm text-center min-h-5 mb-3">{s.log}</p>

      {picking !== null && (
        <Panel className="mb-3">
          <Label>CHOOSE A SHAPE</Label>
          <div className="grid grid-cols-5 gap-2">
            {SHAPES.map(sh => (
              <button key={sh} onClick={() => chooseShape(sh)} aria-label={sh}
                className={`py-3 poster-border bg-white text-3xl ${TINT[sh]}`}>{GLYPH[sh]}</button>
            ))}
          </div>
        </Panel>
      )}

      <div className={`p-3 poster-border ${myTurn ? 'bg-brand-acid' : 'bg-white'}`}>
        <div className="font-display font-black text-xs uppercase mb-2">
          {s.winner !== null ? '' : myTurn ? 'YOUR TURN — PLAY A CARD OR TAP THE MARKET' : 'WAITING…'}
        </div>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {s.hands[0].map((c, i) => (
            <button key={i} onClick={() => tap(i)} disabled={!myTurn || !canPlay(s, c)}
              aria-label={c.shape === 'whot' ? 'Whot 20' : `${c.shape} ${c.n}`}
              className={`${myTurn && canPlay(s, c) ? 'hover:-translate-y-2 transition-transform' : 'opacity-50'}`}>
              <Face c={c} />
            </button>
          ))}
        </div>
      </div>

      {s.winner !== null && (
        <Result
          tone={s.winner === 0 ? 'win' : 'lose'}
          emoji={s.winner === 0 ? '🏆' : '🤖'}
          title={s.winner === 0 ? 'YOU WIN!' : `${name(s.winner).toUpperCase()} WINS`}
          points={points}
          onAgain={reset}
        />
      )}
    </div>
  );
}

const errText = (e: unknown) => {
  let m = e instanceof Error ? e.message : String(e);
  if (m.startsWith('Uncaught Error: ')) m = m.slice('Uncaught Error: '.length);
  const nl = m.indexOf('\n');
  return nl === -1 ? m : m.slice(0, nl);
};

export function WhotOnline({ view, seat, names, act }: OnlineProps<WhotView, WhotAction>) {
  const [picking, setPicking] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Clear a pending shape pick when the turn moves on (render-phase adjust)
  const [lastTurn, setLastTurn] = useState(view.turn);
  if (view.turn !== lastTurn) {
    setLastTurn(view.turn);
    setPicking(null);
  }

  const myTurn = seat !== null && view.turn === seat && view.winner === null;

  const send = async (a: WhotAction) => {
    setErr(null);
    setBusy(true);
    try {
      await act(a);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const tap = (i: number) => {
    if (!myTurn || busy) return;
    const c = view.hand[i];
    if (c.shape === 'whot') { setPicking(i); return; }
    void send({ type: 'play', idx: i });
  };

  const chooseShape = (shape: Shape) => {
    if (picking === null || busy) return;
    const i = picking;
    setPicking(null);
    void send({ type: 'play', idx: i, shape });
  };

  const others = names.map((_, p) => p).filter(p => p !== seat);

  return (
    <div>
      <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${Math.max(others.length, 1)}, minmax(0, 1fr))` }}>
        {others.map(p => (
          <div key={p} className={`p-2 poster-border text-center font-display font-black uppercase text-xs ${view.turn === p && view.winner === null ? 'bg-brand-purple text-brand-cream' : 'bg-white'}`}>
            {names[p]}<div className="text-xl">🂠 {view.handCounts[p] ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-6 p-4 poster-border poster-shadow bg-emerald-800 mb-3">
        <button
          onClick={() => { if (myTurn && !busy) void send({ type: 'draw' }); }}
          disabled={!myTurn || busy}
          aria-label="Go to market and draw a card"
          className="w-20 h-28 poster-border bg-brand-purple text-brand-cream font-display font-black text-xs uppercase disabled:opacity-60 hover:-translate-y-1 transition-transform"
        >
          MARKET<br />{view.marketCount}
        </button>
        <div className="text-center">
          <Face c={view.top} size="lg" />
          {view.want && (
            <div className="mt-1 px-2 py-0.5 bg-white font-display font-black text-sm">{GLYPH[view.want]} {view.want.toUpperCase()}</div>
          )}
        </div>
      </div>

      <p className="font-body text-sm text-center min-h-5 mb-1">{view.log}</p>
      <p className="font-body text-sm text-center text-red-600 min-h-5 mb-3" role="alert">{err ?? ''}</p>

      {picking !== null && (
        <Panel className="mb-3">
          <Label>CHOOSE A SHAPE</Label>
          <div className="grid grid-cols-5 gap-2">
            {SHAPES.map(sh => (
              <button key={sh} onClick={() => chooseShape(sh)} aria-label={sh}
                className={`py-3 poster-border bg-white text-3xl ${TINT[sh]}`}>{GLYPH[sh]}</button>
            ))}
          </div>
        </Panel>
      )}

      <div className={`p-3 poster-border ${myTurn ? 'bg-brand-acid' : 'bg-white'}`}>
        <div className="font-display font-black text-xs uppercase mb-2">
          {view.winner !== null
            ? `${names[view.winner].toUpperCase()} WINS`
            : seat === null
              ? 'WATCHING'
              : myTurn
                ? 'YOUR TURN — PLAY A CARD OR TAP THE MARKET'
                : 'WAITING…'}
        </div>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {seat === null ? (
            <span className="font-display font-black text-3xl">🂠 {view.handCounts.reduce((a, b) => a + b, 0) ? '' : ''}</span>
          ) : (
            view.hand.map((c, i) => (
              <button key={i} onClick={() => tap(i)} disabled={!myTurn || busy}
                aria-label={c.shape === 'whot' ? 'Whot 20' : `${c.shape} ${c.n}`}
                className={`${myTurn && !busy ? 'hover:-translate-y-2 transition-transform' : 'opacity-50'}`}>
                <Face c={c} />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
