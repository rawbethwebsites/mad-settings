import { shuffle, type Rules } from './types';

export type Shape = 'circle' | 'triangle' | 'cross' | 'square' | 'star';
export interface Card {
  shape: Shape | 'whot';
  n: number;
}

export const SHAPES: Shape[] = ['circle', 'triangle', 'cross', 'square', 'star'];
export const GLYPH: Record<Shape, string> = { circle: '●', triangle: '▲', cross: '✚', square: '■', star: '★' };
export const NUMBERS: Record<Shape, number[]> = {
  circle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  triangle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  cross: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  square: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  star: [1, 2, 3, 4, 5, 7, 8],
};
export const SPECIAL = new Set([1, 2, 5, 8, 14, 20]);

export const fullDeck = (): Card[] => [
  ...SHAPES.flatMap(s => NUMBERS[s].map(n => ({ shape: s, n }) as Card)),
  ...Array.from({ length: 5 }, () => ({ shape: 'whot', n: 20 }) as Card),
];

export interface State {
  names: string[];
  hands: Card[][];
  market: Card[];
  pile: Card[];
  want: Shape | null; // shape asked for after a Whot card
  turn: number;
  log: string;
  winner: number | null;
}

export type WhotAction = { type: 'play'; idx: number; shape?: Shape } | { type: 'draw' };

export interface WhotView {
  names: string[];
  handCounts: number[];
  hand: Card[];
  marketCount: number;
  top: Card;
  want: Shape | null;
  turn: number;
  log: string;
  winner: number | null;
}

export function deal(names: string[]): State {
  const players = names.length;
  let market = shuffle(fullDeck());
  const hands: Card[][] = Array.from({ length: players }, () => []);
  for (let r = 0; r < 5; r++) for (let p = 0; p < players; p++) hands[p].push(market.pop() as Card);
  let start = market.pop() as Card;
  while (SPECIAL.has(start.n)) {
    market = shuffle([start, ...market]);
    start = market.pop() as Card;
  }
  return { names, hands, market, pile: [start], want: null, turn: 0, log: 'Match the shape or the number.', winner: null };
}

export const top = (s: State) => s.pile[s.pile.length - 1];

export function canPlay(s: State, c: Card) {
  if (c.shape === 'whot') return true;
  const t = top(s);
  if (s.want) return c.shape === s.want;
  return c.shape === t.shape || c.n === t.n;
}

export function takeFromMarket(s: State, p: number, n: number): State {
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

export function playCard(s: State, p: number, idx: number, shape: Shape | null): State {
  const card = s.hands[p][idx];
  const hands = s.hands.map(h => [...h]);
  hands[p].splice(idx, 1);
  let next: State = { ...s, hands, pile: [...s.pile, card], want: card.shape === 'whot' ? shape : null };
  const n = s.hands.length;
  let step = 1;
  let log = `${s.names[p]} played ${card.shape === 'whot' ? `WHOT (${shape})` : `${GLYPH[card.shape]} ${card.n}`}.`;

  if (hands[p].length === 0) return { ...next, winner: p, log: `${s.names[p]} finished all cards!` };

  if (card.n === 1) { step = 0; log += ` Hold on — ${s.names[p]} plays again.`; }
  else if (card.n === 8) { step = 2; log += ` Suspension — ${s.names[(p + 1) % n]} misses a turn.`; }
  else if (card.n === 2) {
    next = takeFromMarket(next, (p + 1) % n, 2);
    step = 2;
    log += ` ${s.names[(p + 1) % n]} picks two.`;
  } else if (card.n === 5) {
    next = takeFromMarket(next, (p + 1) % n, 3);
    step = 2;
    log += ` ${s.names[(p + 1) % n]} picks three.`;
  } else if (card.n === 14) {
    for (let k = 0; k < n; k++) if (k !== p) next = takeFromMarket(next, k, 1);
    step = 0;
    log += ' General market — everyone else picks one!';
  }
  return { ...next, turn: (p + step) % n, log };
}

export function draw(s: State, p: number): State {
  const n = s.hands.length;
  const next = takeFromMarket(s, p, 1);
  return { ...next, turn: (p + 1) % n, log: `${s.names[p]} went to market.` };
}

export const PRIORITY = (c: Card) => (c.shape === 'whot' ? 0 : c.n === 14 ? 6 : c.n === 5 ? 5 : c.n === 2 ? 4 : c.n === 8 ? 3 : c.n === 1 ? 2 : 1);

export function aiTurn(s: State): State {
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

export const whot: Rules<State, WhotAction, WhotView> = {
  min: 2,
  max: 4,
  points: { win: 80, draw: 0 },
  init: names => deal(names),
  act(s, seat, a) {
    if (whot.outcome(s)) throw new Error('This game is over.');
    if (s.turn !== seat) throw new Error('It is not your turn.');
    if (a.type === 'draw') return draw(s, seat);
    if (!Number.isInteger(a.idx) || a.idx < 0 || a.idx >= s.hands[seat].length) throw new Error('Pick a card from your hand.');
    const card = s.hands[seat][a.idx];
    if (!canPlay(s, card)) throw new Error('That card cannot be played now.');
    if (card.shape === 'whot' && (!a.shape || !SHAPES.includes(a.shape))) {
      throw new Error('Choose a shape for your Whot card.');
    }
    return playCard(s, seat, a.idx, card.shape === 'whot' ? (a.shape as Shape) : null);
  },
  turn: s => (whot.outcome(s) ? null : s.turn),
  outcome: s => (s.winner === null ? null : { winners: [s.winner], reason: `${s.names[s.winner]} finished all cards!` }),
  view(s, seat) {
    return {
      names: s.names,
      handCounts: s.hands.map(h => h.length),
      hand: seat === null ? [] : [...(s.hands[seat] ?? [])],
      marketCount: s.market.length,
      top: top(s),
      want: s.want,
      turn: s.turn,
      log: s.log,
      winner: s.winner,
    };
  },
};
