import { shuffle, type Rules } from './types';

export type Color = 'red' | 'yellow' | 'green' | 'blue';
export type Kind = 'num' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';
export interface Card {
  color: Color | null; // wilds have none until played
  kind: Kind;
  n: number;
}

export const COLORS: Color[] = ['red', 'yellow', 'green', 'blue'];
export const BG: Record<Color, string> = {
  red: 'bg-red-500 text-white',
  yellow: 'bg-yellow-300 text-brand-black',
  green: 'bg-green-600 text-white',
  blue: 'bg-blue-600 text-white',
};

export function fullDeck(): Card[] {
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

export interface State {
  names: string[];
  hands: Card[][];
  market: Card[];
  pile: Card[];
  color: Color; // colour currently in force
  turn: number;
  dir: 1 | -1;
  log: string;
  winner: number | null;
}

export type OchoAction = { type: 'play'; idx: number; color?: Color } | { type: 'draw' };

export interface OchoView {
  names: string[];
  handCounts: number[];
  hand: Card[];
  marketCount: number;
  top: Card;
  color: Color;
  dir: 1 | -1;
  turn: number;
  log: string;
  winner: number | null;
}

export const label = (c: Card) =>
  c.kind === 'num' ? String(c.n) : c.kind === 'skip' ? '⊘' : c.kind === 'reverse' ? '⇄' : c.kind === 'draw2' ? '+2' : c.kind === 'wild' ? 'W' : '+4';

export function deal(names: string[]): State {
  const players = names.length;
  let market = shuffle(fullDeck());
  const hands: Card[][] = Array.from({ length: players }, () => []);
  for (let r = 0; r < 7; r++) for (let p = 0; p < players; p++) hands[p].push(market.pop() as Card);
  let start = market.pop() as Card;
  while (start.kind !== 'num') {
    market = shuffle([start, ...market]);
    start = market.pop() as Card;
  }
  return { names, hands, market, pile: [start], color: start.color as Color, turn: 0, dir: 1, log: 'Match the colour or the number.', winner: null };
}

export const top = (s: State) => s.pile[s.pile.length - 1];

export function canPlay(s: State, c: Card) {
  if (c.kind === 'wild' || c.kind === 'wild4') return true;
  const t = top(s);
  if (c.color === s.color) return true;
  if (c.kind === 'num' && t.kind === 'num') return c.n === t.n;
  return c.kind !== 'num' && c.kind === t.kind;
}

export function take(s: State, p: number, n: number): State {
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

const mod = (a: number, n: number) => ((a % n) + n) % n;

export function play(s: State, p: number, idx: number, chosen: Color | null): State {
  const card = s.hands[p][idx];
  const n = s.hands.length;
  const hands = s.hands.map(h => [...h]);
  hands[p].splice(idx, 1);
  const color = card.color ?? (chosen as Color);
  let next: State = { ...s, hands, pile: [...s.pile, { ...card, color }], color };
  let log = `${s.names[p]} played ${color.toUpperCase()} ${label(card)}.`;
  if (hands[p].length === 0) return { ...next, winner: p, log: `${s.names[p]} is out of cards!` };
  if (hands[p].length === 1) log += ' OCHO!';

  let dir = s.dir;
  let step = 1;
  const victim = mod(p + dir, n);
  if (card.kind === 'skip') { step = 2; log += ` ${s.names[victim]} is skipped.`; }
  else if (card.kind === 'reverse') {
    if (n === 2) step = 2;
    else dir = (dir * -1) as 1 | -1;
    log += ' Direction reversed.';
  } else if (card.kind === 'draw2') {
    next = take(next, victim, 2);
    step = 2;
    log += ` ${s.names[victim]} picks up 2.`;
  } else if (card.kind === 'wild4') {
    next = take(next, victim, 4);
    step = 2;
    log += ` ${s.names[victim]} picks up 4.`;
  }
  return { ...next, dir, turn: mod(p + dir * step, n), log };
}

export function drawOne(s: State, p: number): State {
  const next = take(s, p, 1);
  return { ...next, turn: mod(p + s.dir, s.hands.length), log: `${s.names[p]} picked up a card.` };
}

export function aiTurn(s: State): State {
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

export const ocho: Rules<State, OchoAction, OchoView> = {
  min: 2,
  max: 4,
  points: { win: 80, draw: 0 },
  init: names => deal(names),
  act(s, seat, a) {
    if (ocho.outcome(s)) throw new Error('This game is over.');
    if (s.turn !== seat) throw new Error('It is not your turn.');
    if (a.type === 'draw') return drawOne(s, seat);
    if (!Number.isInteger(a.idx) || a.idx < 0 || a.idx >= s.hands[seat].length) throw new Error('Pick a card from your hand.');
    const card = s.hands[seat][a.idx];
    if (!canPlay(s, card)) throw new Error('That card cannot be played now.');
    if ((card.kind === 'wild' || card.kind === 'wild4') && (!a.color || !COLORS.includes(a.color))) {
      throw new Error('Choose a colour for your wild card.');
    }
    return play(s, seat, a.idx, a.color ?? null);
  },
  turn: s => (ocho.outcome(s) ? null : s.turn),
  outcome: s => (s.winner === null ? null : { winners: [s.winner], reason: `${s.names[s.winner]} is out of cards!` }),
  view(s, seat) {
    return {
      names: s.names,
      handCounts: s.hands.map(h => h.length),
      hand: seat === null ? [] : [...(s.hands[seat] ?? [])],
      marketCount: s.market.length,
      top: top(s),
      color: s.color,
      dir: s.dir,
      turn: s.turn,
      log: s.log,
      winner: s.winner,
    };
  },
};
