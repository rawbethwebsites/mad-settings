// Camper identity + helpers for camp rooms.
// The room id is the same secret id used for live chess, so a camper is one
// person everywhere. It never leaves this browser.

import { getChessPlayerId } from './chessOnline';

export function camperId(): string {
  return getChessPlayerId();
}

// addScore() in player.ts dispatches this after a solo game gives points
export const SCORE_EVENT = 'mad:score';
export interface ScoreDetail {
  game: string;
  points: number;
}

export function stripServerError(e: unknown, fallback = 'Something went wrong. Try again.'): string {
  const msg = e instanceof Error ? e.message : String(e);
  const m = msg.match(/Uncaught Error: (.+?)(?:\n|$)/);
  return m ? m[1] : fallback;
}
