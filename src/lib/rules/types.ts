// Shared shape for games two or more campers play on their own phones.
// The same rules run in the browser (vs computer) and on the server (online),
// so the server is the referee: it rejects moves out of turn or against the rules.
// Imports in this folder stay relative: the Convex bundler does not know the @/ alias.

export interface Outcome {
  /** Seats that won. Empty means a draw. */
  winners: number[];
  reason: string;
}

export interface Rules<S, A, V> {
  min: number;
  max: number;
  /** Room points for each winner, and for everyone on a draw */
  points: { win: number; draw: number };
  init(names: string[]): S;
  /** Returns the next state, or throws an Error with a message a camper can read */
  act(s: S, seat: number, a: A): S;
  turn(s: S): number | null;
  outcome(s: S): Outcome | null;
  /** What one seat may see (card games hide the other hands). null = spectator */
  view(s: S, seat: number | null): V;
}

export const shuffle = <T,>(a: T[]) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

/** What an online game screen gets from the shared match wrapper (GameShell) */
export interface OnlineProps<V, A> {
  view: V;
  /** Your seat, or null if you are watching */
  seat: number | null;
  /** Camper names by seat */
  names: string[];
  /** Sends a move to the server; rejects with a readable message if it is not allowed */
  act: (a: A) => Promise<void>;
}
