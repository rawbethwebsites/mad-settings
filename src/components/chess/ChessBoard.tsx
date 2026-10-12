'use client';

import type { Chess, Color, Move, PieceSymbol, Square } from 'chess.js';
import { CAMP_PIECES, PIECE_LETTER, SIDES, PROMOTION_CHOICES } from '@/data/chessPieces';

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

export default function ChessBoard({ chess, flipped, selected, legal, lastMove, onSquare, promo, onPromote }: BoardProps) {
  const board = chess.board();
  const checkSquare = kingInCheck(chess);
  const order = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <div
      className="relative grid grid-cols-8 w-full aspect-square border-4 border-brand-black poster-shadow bg-brand-black"
      role="grid"
      aria-label="Chess board"
    >
      {order.map(r =>
        order.map(c => {
          const sq = squareName(r, c);
          const cell = board[r][c];
          const dark = (r + c) % 2 === 1;
          const move = legal.find(m => m.to === sq);
          const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq);
          const bg =
            checkSquare === sq
              ? 'bg-brand-coral'
              : selected === sq
                ? 'bg-yellow-300'
                : isLast
                  ? dark ? 'bg-lime-600' : 'bg-lime-200'
                  : dark ? 'bg-emerald-800' : 'bg-amber-100';
          const tint = dark ? 'text-amber-100/80' : 'text-emerald-900/70';
          return (
            <button
              key={sq}
              onClick={() => onSquare(sq)}
              aria-label={`${sq}${cell ? ` ${CAMP_PIECES[cell.type].name} (${SIDES[cell.color].name})` : ' empty'}${move ? ', legal move' : ''}`}
              className={`relative flex items-center justify-center ${bg} focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-purple focus-visible:z-10`}
            >
              {c === order[0] && (
                <span className={`absolute top-0.5 left-0.5 text-[9px] font-bold leading-none ${tint}`}>{8 - r}</span>
              )}
              {r === order[7] && (
                <span className={`absolute bottom-0.5 right-0.5 text-[9px] font-bold leading-none ${tint}`}>{FILES[c]}</span>
              )}
              {cell && <Token type={cell.type} color={cell.color} />}
              {move && !cell && <span className="absolute w-1/3 h-1/3 rounded-full bg-brand-black/40" />}
              {move && cell && (
                <span className="absolute inset-0.5 rounded-full border-4 border-brand-black/50 pointer-events-none" />
              )}
            </button>
          );
        })
      )}

      {promo && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-brand-black/70 p-4">
          <div className="bg-white poster-border p-4 text-center w-full max-w-xs">
            <div className="font-display font-black uppercase mb-3">LEVEL UP YOUR PINE!</div>
            <div className="grid grid-cols-4 gap-2">
              {PROMOTION_CHOICES.map(t => (
                <button
                  key={t}
                  onClick={() => onPromote(t)}
                  className="flex flex-col items-center gap-1 p-2 poster-border bg-brand-cream hover:bg-brand-acid"
                  aria-label={`Promote to ${CAMP_PIECES[t].name}`}
                >
                  <span className="text-3xl leading-none">{CAMP_PIECES[t].emoji}</span>
                  <span className="font-display font-bold text-[9px] uppercase leading-tight">{CAMP_PIECES[t].name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
