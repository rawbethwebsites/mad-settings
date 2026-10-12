import type { Color, PieceSymbol } from 'chess.js';

export interface CampPiece {
  emoji: string;
  name: string;
  role: string;
  blurb: string;
}

// Camp-flavoured skin for the standard chess set
export const CAMP_PIECES: Record<PieceSymbol, CampPiece> = {
  k: { emoji: '🔥', name: 'Campfire', role: 'King', blurb: 'Keep it lit. If it goes out, the night is over.' },
  q: { emoji: '🎤', name: 'Karaoke Queen', role: 'Queen', blurb: 'Owns the whole stage. Any direction, any distance.' },
  r: { emoji: '⛺', name: 'Tent', role: 'Rook', blurb: 'Sturdy. Moves in straight lines, up/down and across.' },
  b: { emoji: '🔦', name: 'Flashlight', role: 'Bishop', blurb: 'Beams down the diagonals, as far as it can see.' },
  n: { emoji: '🦊', name: 'Fox', role: 'Knight', blurb: 'Sneaks over anything in an L-shaped jump.' },
  p: { emoji: '🌲', name: 'Pine', role: 'Pawn', blurb: 'Steps forward, captures sideways. Reach the far end to level up.' },
};

// Standard chess letters, shown on each piece so the camp icons are never a guess
export const PIECE_LETTER: Record<PieceSymbol, string> = { k: 'K', q: 'Q', r: 'R', b: 'B', n: 'N', p: 'P' };

export const SIDES: Record<Color, { name: string; chip: string }> = {
  w: { name: 'DAY CAMPERS', chip: 'bg-brand-acid text-brand-black' },
  b: { name: 'NIGHT OWLS', chip: 'bg-brand-purple text-brand-cream' },
};

export const PROMOTION_CHOICES: PieceSymbol[] = ['q', 'r', 'b', 'n'];

export type ChessLevel = 'easy' | 'medium' | 'hard';

export const LEVELS: { id: ChessLevel; label: string; blurb: string; win: number }[] = [
  { id: 'easy', label: 'ROOKIE', blurb: 'Makes mistakes. Good for warming up.', win: 40 },
  { id: 'medium', label: 'CAMPER', blurb: 'Sees a couple of moves ahead.', win: 80 },
  { id: 'hard', label: 'CAMP CHIEF', blurb: 'Thinks three moves ahead. Bring snacks.', win: 150 },
];

export const DRAW_POINTS = 20;
export const ONLINE_WIN_POINTS = 50;
