'use client';

import { useEffect, useState } from 'react';
import { Btn, Label, Panel, Result } from '@/components/arcade/ui';
import type { OnlineProps } from '@/lib/rules/types';
import {
  aiTurn,
  BG,
  canPlay,
  COLORS,
  deal,
  drawOne,
  label,
  play,
  top,
  type Card,
  type Color,
  type OchoAction,
  type OchoView,
  type State,
} from '@/lib/rules/ocho';

export function Face({ c, color }: { c: Card; color?: Color }) {
  const bg = c.color ?? color;
  return (
    <span
      className={`flex items-center justify-center w-12 h-[4.5rem] border-2 border-brand-black font-display font-black text-xl ${
        bg ? BG[bg] : 'bg-brand-black text-brand-cream'
      }`}
    >
      {label(c)}
    </span>
  );
}

export default function Ocho({ award }: { award: (n: number) => void }) {
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
          Match the colour or the number and be first to empty your hand. Shout <b>OCHO!</b> when you&apos;re down to one.
        </p>
        <ul className="font-body text-sm mb-5 space-y-1 list-disc pl-5">
          <li><b>⊘</b> skips the next player · <b>⇄</b> reverses the direction</li>
          <li><b>+2</b> makes the next player pick up two</li>
          <li><b>W</b> wild — choose the colour · <b>+4</b> wild, next player picks four</li>
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

  const tap = (i: number) => {
    if (!myTurn) return;
    const c = s.hands[0][i];
    if (!canPlay(s, c)) return;
    if (!c.color) { setPicking(i); return; }
    const next = play(s, 0, i, null);
    setS(next);
    settle(next);
  };

  const choose = (color: Color) => {
    if (picking === null) return;
    const next = play(s, 0, picking, color);
    setPicking(null);
    setS(next);
    settle(next);
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

      <div className="flex items-center justify-center gap-6 p-4 poster-border poster-shadow bg-brand-black mb-3">
        <button onClick={() => myTurn && setS(drawOne(s, 0))} disabled={!myTurn} aria-label="Pick up a card"
          className="w-16 h-24 poster-border bg-brand-purple text-brand-cream font-display font-black text-xs uppercase disabled:opacity-60 hover:-translate-y-1 transition-transform">
          PICK UP<br />{s.market.length}
        </button>
        <div className="text-center">
          <span className={`flex items-center justify-center w-16 h-24 border-4 border-brand-cream font-display font-black text-3xl ${BG[s.color]}`}>
            {label(top(s))}
          </span>
          <div className="mt-1 font-display font-black text-xs uppercase text-brand-cream">{s.color}</div>
        </div>
      </div>

      <p className="font-body text-sm text-center min-h-5 mb-3">{s.log}</p>

      {picking !== null && (
        <Panel className="mb-3">
          <Label>CHOOSE A COLOUR</Label>
          <div className="grid grid-cols-4 gap-2">
            {COLORS.map(c => (
              <button key={c} onClick={() => choose(c)} aria-label={c} className={`py-4 poster-border font-display font-black uppercase text-xs ${BG[c]}`}>{c}</button>
            ))}
          </div>
        </Panel>
      )}

      <div className={`p-3 poster-border ${myTurn ? 'bg-brand-acid' : 'bg-white'}`}>
        <div className="font-display font-black text-xs uppercase mb-2">
          {s.winner !== null ? '' : myTurn ? 'YOUR TURN — PLAY A CARD OR PICK UP' : 'WAITING…'}
        </div>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {s.hands[0].map((c, i) => (
            <button key={i} onClick={() => tap(i)} disabled={!myTurn || !canPlay(s, c)}
              aria-label={`${c.color ?? 'wild'} ${label(c)}`}
              className={myTurn && canPlay(s, c) ? 'hover:-translate-y-2 transition-transform' : 'opacity-50'}>
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

export function OchoOnline({ view, seat, names, act }: OnlineProps<OchoView, OchoAction>) {
  const [picking, setPicking] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Clear a pending colour pick when the turn moves on (render-phase adjust)
  const [lastTurn, setLastTurn] = useState(view.turn);
  if (view.turn !== lastTurn) {
    setLastTurn(view.turn);
    setPicking(null);
  }

  const myTurn = seat !== null && view.turn === seat && view.winner === null;

  const send = async (a: OchoAction) => {
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
    if (!c.color) { setPicking(i); return; }
    void send({ type: 'play', idx: i });
  };

  const choose = (color: Color) => {
    if (picking === null || busy) return;
    const i = picking;
    setPicking(null);
    void send({ type: 'play', idx: i, color });
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

      <div className="flex items-center justify-center gap-6 p-4 poster-border poster-shadow bg-brand-black mb-3">
        <button
          onClick={() => { if (myTurn && !busy) void send({ type: 'draw' }); }}
          disabled={!myTurn || busy}
          aria-label="Pick up a card"
          className="w-16 h-24 poster-border bg-brand-purple text-brand-cream font-display font-black text-xs uppercase disabled:opacity-60 hover:-translate-y-1 transition-transform"
        >
          PICK UP<br />{view.marketCount}
        </button>
        <div className="text-center">
          <span className={`flex items-center justify-center w-16 h-24 border-4 border-brand-cream font-display font-black text-3xl ${BG[view.color]}`}>
            {label(view.top)}
          </span>
          <div className="mt-1 font-display font-black text-xs uppercase text-brand-cream">{view.color}</div>
        </div>
      </div>

      <p className="font-body text-sm text-center min-h-5 mb-1">{view.log}</p>
      <p className="font-body text-sm text-center text-red-600 min-h-5 mb-3" role="alert">{err ?? ''}</p>

      {picking !== null && (
        <Panel className="mb-3">
          <Label>CHOOSE A COLOUR</Label>
          <div className="grid grid-cols-4 gap-2">
            {COLORS.map(c => (
              <button key={c} onClick={() => choose(c)} aria-label={c} className={`py-4 poster-border font-display font-black uppercase text-xs ${BG[c]}`}>{c}</button>
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
                ? 'YOUR TURN — PLAY A CARD OR PICK UP'
                : 'WAITING…'}
        </div>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {seat === null ? null : (
            view.hand.map((c, i) => (
              <button key={i} onClick={() => tap(i)} disabled={!myTurn || busy}
                aria-label={`${c.color ?? 'wild'} ${label(c)}`}
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
