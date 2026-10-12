'use client';

import { useEffect, useState } from 'react';
import { Btn, Label, Panel, Result } from '@/components/arcade/ui';

type Color = 'red' | 'yellow' | 'green' | 'blue';
type Kind = 'num' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';
interface Card {
  color: Color | null; // wilds have none until played
  kind: Kind;
  n: number;
}

const COLORS: Color[] = ['red', 'yellow', 'green', 'blue'];
const BG: Record<Color, string> = {
  red: 'bg-red-500 text-white',
  yellow: 'bg-yellow-300 text-brand-black',
  green: 'bg-green-600 text-white',
  blue: 'bg-blue-600 text-white',
};

const shuffle = <T,>(a: T[]) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

function fullDeck(): Card[] {
  const d: Card[] = [];
  for (const color of COLORS) {
    d.push({ color, kind: 'num', n: 0 });
    for (let n = 1; n <= 9; n++) d.push({ color, kind: 'num', n }, { color, kind: 'num', n });
    for (let k = 0; k < 2; k++) {
      d.push({ color, kind: 'skip', n: -1 }, { color, kind: 'reverse', n: -1 }, { color, kind: 'draw2', n: -1 });
    }
  }
  for (let k = 0; k < 4; k++) d.push({ color: null, kind: 'wild', n: -1 }, { color: null, kind: 'wild4', n: -1 });
  return d;
}

interface State {
  hands: Card[][];
  market: Card[];
  pile: Card[];
  color: Color; // colour currently in force
  turn: number;
  dir: 1 | -1;
  log: string;
  winner: number | null;
}

const label = (c: Card) =>
  c.kind === 'num' ? String(c.n) : c.kind === 'skip' ? '⊘' : c.kind === 'reverse' ? '⇄' : c.kind === 'draw2' ? '+2' : c.kind === 'wild' ? 'W' : '+4';

function deal(players: number): State {
  let market = shuffle(fullDeck());
  const hands: Card[][] = Array.from({ length: players }, () => []);
  for (let r = 0; r < 7; r++) for (let p = 0; p < players; p++) hands[p].push(market.pop() as Card);
  let start = market.pop() as Card;
  while (start.kind !== 'num') {
    market = shuffle([start, ...market]);
    start = market.pop() as Card;
  }
  return { hands, market, pile: [start], color: start.color as Color, turn: 0, dir: 1, log: 'Match the colour or the number.', winner: null };
}

const top = (s: State) => s.pile[s.pile.length - 1];

function canPlay(s: State, c: Card) {
  if (c.kind === 'wild' || c.kind === 'wild4') return true;
  const t = top(s);
  if (c.color === s.color) return true;
  if (c.kind === 'num' && t.kind === 'num') return c.n === t.n;
  return c.kind !== 'num' && c.kind === t.kind;
}

function take(s: State, p: number, n: number): State {
  let market = [...s.market];
  let pile = [...s.pile];
  const hands = s.hands.map(h => [...h]);
  for (let k = 0; k < n; k++) {
    if (market.length === 0) {
      const keep = pile.pop() as Card;
      market = shuffle(pile.map(c => (c.kind === 'wild' || c.kind === 'wild4' ? { ...c, color: null } : c)));
      pile = [keep];
      if (market.length === 0) break;
    }
    hands[p].push(market.pop() as Card);
  }
  return { ...s, hands, market, pile };
}

const name = (p: number) => (p === 0 ? 'You' : `Computer ${p}`);
const mod = (a: number, n: number) => ((a % n) + n) % n;

function play(s: State, p: number, idx: number, chosen: Color | null): State {
  const card = s.hands[p][idx];
  const n = s.hands.length;
  const hands = s.hands.map(h => [...h]);
  hands[p].splice(idx, 1);
  const color = card.color ?? (chosen as Color);
  let next: State = { ...s, hands, pile: [...s.pile, { ...card, color }], color };
  let log = `${name(p)} played ${color.toUpperCase()} ${label(card)}.`;
  if (hands[p].length === 0) return { ...next, winner: p, log: `${name(p)} is out of cards!` };
  if (hands[p].length === 1) log += ` ${p === 0 ? 'OCHO!' : `${name(p)} calls OCHO!`}`;

  let dir = s.dir;
  let step = 1;
  const victim = mod(p + dir, n);
  if (card.kind === 'skip') { step = 2; log += ` ${name(victim)} is skipped.`; }
  else if (card.kind === 'reverse') {
    if (n === 2) step = 2;
    else dir = (dir * -1) as 1 | -1;
    log += ' Direction reversed.';
  } else if (card.kind === 'draw2') {
    next = take(next, victim, 2);
    step = 2;
    log += ` ${name(victim)} picks up 2.`;
  } else if (card.kind === 'wild4') {
    next = take(next, victim, 4);
    step = 2;
    log += ` ${name(victim)} picks up 4.`;
  }
  return { ...next, dir, turn: mod(p + dir * step, n), log };
}

function drawOne(s: State, p: number): State {
  const next = take(s, p, 1);
  return { ...next, turn: mod(p + s.dir, s.hands.length), log: `${name(p)} picked up a card.` };
}

function aiTurn(s: State): State {
  const p = s.turn;
  const playable = s.hands[p].map((c, i) => ({ c, i })).filter(x => canPlay(s, x.c));
  if (playable.length === 0) return drawOne(s, p);
  // Keep wilds for later, play actions before plain numbers
  const rank = (c: Card) => (c.kind === 'wild' || c.kind === 'wild4' ? 0 : c.kind === 'num' ? 1 : 2);
  playable.sort((a, b) => rank(b.c) - rank(a.c));
  const { c, i } = playable[0];
  let chosen: Color | null = null;
  if (!c.color) {
    const counts: Record<Color, number> = { red: 0, yellow: 0, green: 0, blue: 0 };
    s.hands[p].forEach(h => h.color && counts[h.color]++);
    chosen = COLORS.slice().sort((a, b) => counts[b] - counts[a])[0];
  }
  return play(s, p, i, chosen);
}

function Face({ c, color }: { c: Card; color?: Color }) {
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
        <Btn className="w-full" onClick={() => setS(deal(opponents + 1))}>DEAL →</Btn>
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

  return (
    <div>
      <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${s.hands.length - 1}, minmax(0, 1fr))` }}>
        {s.hands.slice(1).map((h, k) => (
          <div key={k} className={`p-2 poster-border text-center font-display font-black uppercase text-xs ${s.turn === k + 1 && s.winner === null ? 'bg-brand-purple text-brand-cream' : 'bg-white'}`}>
            COMPUTER {k + 1}<div className="text-xl">🂠 {h.length}</div>
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
