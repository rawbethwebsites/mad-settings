'use client';

import { useEffect, useState } from 'react';
import { Btn, Label, Panel, Result } from '@/components/arcade/ui';

type Shape = 'circle' | 'triangle' | 'cross' | 'square' | 'star';
interface Card {
  shape: Shape | 'whot';
  n: number;
}

const SHAPES: Shape[] = ['circle', 'triangle', 'cross', 'square', 'star'];
const GLYPH: Record<Shape, string> = { circle: '●', triangle: '▲', cross: '✚', square: '■', star: '★' };
const TINT: Record<Shape, string> = {
  circle: 'text-red-600',
  triangle: 'text-blue-600',
  cross: 'text-green-700',
  square: 'text-amber-600',
  star: 'text-purple-700',
};
const NUMBERS: Record<Shape, number[]> = {
  circle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  triangle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  cross: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  square: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  star: [1, 2, 3, 4, 5, 7, 8],
};
const SPECIAL = new Set([1, 2, 5, 8, 14, 20]);

const shuffle = <T,>(a: T[]) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

const fullDeck = (): Card[] => [
  ...SHAPES.flatMap(s => NUMBERS[s].map(n => ({ shape: s, n }) as Card)),
  ...Array.from({ length: 5 }, () => ({ shape: 'whot', n: 20 }) as Card),
];

interface State {
  hands: Card[][];
  market: Card[];
  pile: Card[];
  want: Shape | null; // shape asked for after a Whot card
  turn: number;
  log: string;
  winner: number | null;
}

function deal(players: number): State {
  let market = shuffle(fullDeck());
  const hands: Card[][] = Array.from({ length: players }, () => []);
  for (let r = 0; r < 5; r++) for (let p = 0; p < players; p++) hands[p].push(market.pop() as Card);
  let start = market.pop() as Card;
  while (SPECIAL.has(start.n)) {
    market = shuffle([start, ...market]);
    start = market.pop() as Card;
  }
  return { hands, market, pile: [start], want: null, turn: 0, log: 'Match the shape or the number.', winner: null };
}

const top = (s: State) => s.pile[s.pile.length - 1];

function canPlay(s: State, c: Card) {
  if (c.shape === 'whot') return true;
  const t = top(s);
  if (s.want) return c.shape === s.want;
  return c.shape === t.shape || c.n === t.n;
}

function takeFromMarket(s: State, p: number, n: number): State {
  let market = [...s.market];
  let pile = [...s.pile];
  const hands = s.hands.map(h => [...h]);
  for (let k = 0; k < n; k++) {
    if (market.length === 0) {
      const keep = pile.pop() as Card;
      market = shuffle(pile);
      pile = [keep];
      if (market.length === 0) break;
    }
    hands[p].push(market.pop() as Card);
  }
  return { ...s, hands, market, pile };
}

const name = (p: number) => (p === 0 ? 'You' : `Computer ${p}`);

function playCard(s: State, p: number, idx: number, shape: Shape | null): State {
  const card = s.hands[p][idx];
  const hands = s.hands.map(h => [...h]);
  hands[p].splice(idx, 1);
  let next: State = { ...s, hands, pile: [...s.pile, card], want: card.shape === 'whot' ? shape : null };
  const n = s.hands.length;
  let step = 1;
  let log = `${name(p)} played ${card.shape === 'whot' ? `WHOT (${shape})` : `${GLYPH[card.shape]} ${card.n}`}.`;

  if (hands[p].length === 0) return { ...next, winner: p, log: `${name(p)} finished all cards!` };

  if (card.n === 1) { step = 0; log += ` Hold on — ${name(p)} plays again.`; }
  else if (card.n === 8) { step = 2; log += ` Suspension — ${name((p + 1) % n)} misses a turn.`; }
  else if (card.n === 2) {
    next = takeFromMarket(next, (p + 1) % n, 2);
    step = 2;
    log += ` ${name((p + 1) % n)} picks two.`;
  } else if (card.n === 5) {
    next = takeFromMarket(next, (p + 1) % n, 3);
    step = 2;
    log += ` ${name((p + 1) % n)} picks three.`;
  } else if (card.n === 14) {
    for (let k = 0; k < n; k++) if (k !== p) next = takeFromMarket(next, k, 1);
    step = 0;
    log += ' General market — everyone else picks one!';
  }
  return { ...next, turn: (p + step) % n, log };
}

function draw(s: State, p: number): State {
  const n = s.hands.length;
  const next = takeFromMarket(s, p, 1);
  return { ...next, turn: (p + 1) % n, log: `${name(p)} went to market.` };
}

const PRIORITY = (c: Card) => (c.shape === 'whot' ? 0 : c.n === 14 ? 6 : c.n === 5 ? 5 : c.n === 2 ? 4 : c.n === 8 ? 3 : c.n === 1 ? 2 : 1);

function aiTurn(s: State): State {
  const p = s.turn;
  const options = s.hands[p].map((c, i) => ({ c, i })).filter(x => canPlay(s, x.c));
  if (options.length === 0) return draw(s, p);
  options.sort((a, b) => PRIORITY(b.c) - PRIORITY(a.c));
  const { c, i } = options[0];
  let shape: Shape | null = null;
  if (c.shape === 'whot') {
    const counts = new Map<Shape, number>();
    s.hands[p].forEach(h => h.shape !== 'whot' && counts.set(h.shape, (counts.get(h.shape) ?? 0) + 1));
    shape = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? SHAPES[Math.floor(Math.random() * 5)];
  }
  return playCard(s, p, i, shape);
}

function Face({ c, size = 'md' }: { c: Card; size?: 'md' | 'lg' }) {
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
        <Btn className="w-full" onClick={() => setS(deal(opponents + 1))}>DEAL →</Btn>
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

  return (
    <div>
      <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${s.hands.length - 1}, minmax(0, 1fr))` }}>
        {s.hands.slice(1).map((h, k) => (
          <div key={k} className={`p-2 poster-border text-center font-display font-black uppercase text-xs ${s.turn === k + 1 && s.winner === null ? 'bg-brand-purple text-brand-cream' : 'bg-white'}`}>
            COMPUTER {k + 1}<div className="text-xl">🂠 {h.length}</div>
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
