'use client';

import type { Chess, Color, Move, PieceSymbol, Square } from 'chess.js';
import { CAMP_PIECES, PIECE_LETTER, SIDES, PROMOTION_CHOICES } from '@/data/chessPieces';
import ChessBoardBoard from '@/components/boards/ChessBoardBoard';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const squareName = (row: number, col: number) => `${FILES[col]}${8 - row}` as Square;

export function Token({ type, color }: { type: PieceSymbol; color: Color }) {
  const p = CAMP_PIECES[type];
  return (
    <span
      className={`relative flex items-center justify-center w-[84%] h-[84%] rounded-full border-2 border-brand-black text-[clamp(18px,5.2vw,32px)] leading-none select-none ${
        color === 'w' ? 'bg-brand-acid' : 'bg-brand-purple'
      }`}
      title={`${p.name} (${p.role})`}
    >
      {p.emoji}
      <span className="absolute -bottom-1 -right-1 flex items-center justify-center w-[42%] h-[42%] rounded-full bg-brand-black text-brand-cream font-display font-black text-[clamp(8px,2.3vw,12px)] leading-none">
        {PIECE_LETTER[type]}
      </span>
    </span>
  );
}

export function kingInCheck(chess: Chess): Square | null {
  if (!chess.inCheck()) return null;
  for (const row of chess.board()) {
    for (const c of row) if (c && c.type === 'k' && c.color === chess.turn()) return c.square;
  }
  return null;
}

export function capturedBy(chess: Chess): Record<Color, PieceSymbol[]> {
  const out: Record<Color, PieceSymbol[]> = { w: [], b: [] };
  for (const m of chess.history({ verbose: true })) if (m.captured) out[m.color].push(m.captured);
  return out;
}

export function PlayerStrip({
  color,
  label,
  active,
  captured,
}: {
  color: Color;
  label: string;
  active: boolean;
  captured: PieceSymbol[];
}) {
  return (
    <div className="flex items-center justify-between gap-2 min-h-8">
      <span
        className={`px-2 py-1 font-display font-black text-xs uppercase poster-border ${SIDES[color].chip} ${
          active ? 'ring-2 ring-brand-black ring-offset-1' : ''
        }`}
      >
        {label}
      </span>
      <span className="flex flex-nowrap justify-end gap-0.5 text-lg leading-none overflow-hidden" aria-label="Captured pieces">
        {captured.map((t, i) => (
          <span key={i}>{CAMP_PIECES[t].emoji}</span>
        ))}
      </span>
    </div>
  );
}

interface BoardProps {
  chess: Chess;
  flipped: boolean;
  selected: Square | null;
  legal: Move[];
  lastMove: { from: string; to: string } | null;
  onSquare: (sq: Square) => void;
  promo: { from: Square; to: Square } | null;
  onPromote: (t: PieceSymbol) => void;
}

export default function ChessBoard({
  chess,
  flipped,
  selected,
  legal,
  lastMove,
  onSquare,
  promo,
  onPromote,
}: BoardProps) {
  return (
    <ChessBoardBoard
      chess={chess}
      flipped={flipped}
      selected={selected}
      legal={legal}
      lastMove={lastMove}
      onSquare={onSquare}
      promo={promo}
      onPromote={onPromote}
    />
  );
}