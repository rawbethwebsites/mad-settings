import type { Rules } from './types';

export interface RaceState {
  seed: number;
  finished: (number | null)[];
}

export interface RaceAction {
  score: number;
}

export interface RaceView {
  seed: number;
  names: string[];
  finished: (number | null)[];
  scores: (number | null)[];
  myScore: number | null;
  allDone: boolean;
}

export const race: Rules<RaceState, RaceAction, RaceView> = {
  min: 2,
  max: 4,
  points: { win: 80, draw: 30 },
  init: (names) => {
    const seed = Math.floor(Math.random() * 1_000_000_000);
    return { seed, finished: Array(names.length).fill(null) };
  },
  act(s, seat, a) {
    if (race.outcome(s)) throw new Error('This race is already finished.');
    if (s.finished[seat] !== null) throw new Error('You have already submitted a score.');
    if (!Number.isInteger(a.score) || a.score < 0 || a.score > 1000) {
      throw new Error('Score must be an integer between 0 and 1000.');
    }
    const finished = [...s.finished];
    finished[seat] = a.score;
    return { ...s, finished };
  },
  turn: () => null,
  outcome(s) {
    const allDone = s.finished.every(v => v !== null);
    if (!allDone) return null;
    const scores = s.finished as number[];
    const max = Math.max(...scores);
    const winners = scores.map((v, i) => v === max ? i : -1).filter(i => i !== -1);
    const allSame = scores.every(v => v === max);
    return {
      winners: allSame ? [] : winners,
      reason: allSame ? 'Everyone scored the same.' : 'Highest score wins.',
    };
  },
  view(s, seat) {
    const allDone = s.finished.every(v => v !== null);
    const scores = s.finished.map(v => (v === null ? null : v));
    return {
      seed: s.seed,
      names: [],
      // -1 = finished, score hidden until everyone is done
      finished: s.finished.map(v => (v === null ? null : allDone ? v : -1)),
      scores: allDone ? scores : Array(s.finished.length).fill(null),
      myScore: seat !== null ? s.finished[seat] : null,
      allDone,
    };
  },
};
