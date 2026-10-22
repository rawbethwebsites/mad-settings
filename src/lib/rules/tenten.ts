import type { Rules } from './types';

export type Dir = 'up' | 'down' | 'left' | 'right';

export interface State {
  round: number;
  chaser: boolean; // odd rounds you chase (match), even escape (differ)
  picks: (Dir | null)[];
  scores: number[];
  winner: number | null;
  reveal: { p0: Dir | null; p1: Dir | null; same: boolean } | null;
}

export interface Action { dir: Dir }

const TO_WIN = 5;

export type TentView = {
  round: number;
  chaser: boolean;
  myPick: Dir | null;
  theirPick: Dir | null;
  reveal: { p0: Dir | null; p1: Dir | null; same: boolean } | null;
  scores: number[];
  winner: number | null;
};

export const tenten: Rules<State, Action, TentView> = {
  min: 2,
  max: 2,
  points: { win: 60, draw: 0 },
  init(names) {
    return {
      round: 1,
      chaser: true,
      picks: [null, null],
      scores: [0,0],
      winner: null,
      reveal: null,
    };
  },
  act(s, seat, a) {
    if (s.winner !== null) throw new Error('This game is over.');
    if (s.picks[seat] !== null) throw new Error('You already picked this round.');
    const picks = [...s.picks];
    picks[seat] = a.dir;
    if (picks.some(p => p === null)) {
      return { ...s, picks };
    }
    const p0 = picks[0]!;
    const p1 = picks[1]!;
    const same = p0 === p1;
    const winnerSeat = s.chaser ? (same ? 0 : 1) : (same ? 1 : 0);
    const scores = [...s.scores];
    scores[winnerSeat] += 1;
    const isDone = scores.some(sc => sc >= TO_WIN);
    return {
      round: isDone ? s.round : s.round + 1,
      chaser: isDone ? s.chaser : (isDone ? true : (s.round + 1) % 2 === 1),
      picks: isDone ? [null, null] : [null, null],
      scores,
      winner: isDone ? winnerSeat : null,
      reveal: { p0, p1, same },
    };
  },
  turn(s) { return s.winner !== null ? null : null; }, // no turn order, both pick at same time
  outcome(s) {
    if (s.winner === null) return null;
    return { winners: [s.winner], reason: `${s.winner === 0 ? 'You' : 'Opponent'} reached ${TO_WIN} first.` };
  },
  view(s, seat) {
    const myPick = seat !== null ? s.picks[seat] : null;
    const theirPick = seat !== null ? s.picks[seat === 0 ? 1 : 0] : null;
    const bothPicked = s.picks.every(p => p !== null) || s.reveal !== null;
    const hide = !bothPicked && s.picks[seat ?? -1] !== null;
    return {
      round: s.round,
      chaser: s.chaser,
      myPick: hide ? null : myPick,
      theirPick: hide ? null : theirPick,
      reveal: s.reveal,
      scores: s.scores,
      winner: s.winner,
    };
  },
};
