import type { Rules } from './types';

export interface SameState {
  prompts: string[];
  idx: number;
  lives: number[];
  submitted: (string | null)[];
  winner: number | null;
  done?: boolean;
}

export interface SameAction {
  word: string;
}

export type SameView = {
  prompt: string;
  idx: number;
  lives: number[];
  myWord: string | null;
  others: (string | null)[];
  winner: number | null;
  finished: boolean;
};

export const same: Rules<SameState, SameAction, SameView> = {
  min: 2,
  max: 4,
  points: { win: 70, draw: 20 },
  init(names) {
    const prompts = ['thing you see every day', 'city you want to visit', 'food you love', 'animal', 'song', 'movie', 'drink', 'hobby', 'color', 'name'];
    return {
      prompts,
      idx: 0,
      lives: Array(names.length).fill(3),
      submitted: Array(names.length).fill(null),
      winner: null,
    };
  },
  act(s, seat, a) {
    if (s.done || s.winner !== null) throw new Error('Game already finished.');
    if (s.submitted[seat] !== null) throw new Error('You already submitted for this round.');
    const word = a.word.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!word) throw new Error('Please type a word.');
    const submitted = [...s.submitted];
    submitted[seat] = word;
    const allIn = submitted.every(v => v !== null);
    if (!allIn) {
      return { ...s, submitted };
    }
    const lives = [...s.lives];
    const counts = new Map<string, number[]>();
    submitted.forEach((w, i) => {
      const arr = counts.get(w) ?? [];
      arr.push(i);
      counts.set(w, arr);
    });
    counts.forEach(ids => {
      if (ids.length > 1) {
        ids.forEach(i => { lives[i] = Math.max(0, lives[i] - 1); });
      }
    });
    const aliveCount = lives.filter(v => v > 0).length;
    const maxLives = Math.max(...lives);
    const nextIdx = s.idx + 1;
    // Ends when one camper (or nobody) has lives left, or the prompts run out
    const finished = aliveCount <= 1 || nextIdx >= s.prompts.length;
    const top = lives.map((v, i) => (v === maxLives ? i : -1)).filter(i => i !== -1);
    return {
      ...s,
      lives,
      submitted: Array(s.submitted.length).fill(null),
      idx: finished ? s.idx : nextIdx,
      winner: finished && top.length === 1 ? top[0] : null,
      done: finished,
    };
  },
  turn: () => null,
  outcome(s) {
    if (!s.done && s.winner === null) return null;
    if (s.winner === null) return { winners: [], reason: 'Tied on lives.' };
    return { winners: [s.winner], reason: 'Last one standing.' };
  },
  view(s, seat) {
    const prompt = s.prompts[s.idx] ?? '...';
    const allSubmitted = s.submitted.every(v => v !== null);
    const myWord = seat !== null ? s.submitted[seat] : null;
    const hidden = !allSubmitted;
    return {
      prompt,
      idx: s.idx,
      lives: s.lives,
      myWord,
      others: s.submitted.map((w, i) => (i === seat || hidden) ? null : w),
      winner: s.winner,
      finished: !!s.done || s.winner !== null,
    };
  },
};
