'use client';

import type { Chess, Color, Move, PieceSymbol, Square } from 'chess.js';
import { CAMP_PIECES, PIECE_LETTER, SIDES } from '@/data/chessPieces';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const squareName = (row: number, col: number) => `${FILES[col]}${8 - row}` as Square;

interface ChessBoardBoardProps {
  chess: Chess;
  flipped: boolean;
  selected: Square | null;
  legal: Move[];
  lastMove: { from: string; to: string } | null;
  onSquare: (sq: Square) => void;
  promo: { from: Square; to: Square } | null;
  onPromote: (t: PieceSymbol) => void;
}

interface PiecePosition {
  square: Square;
  type: PieceSymbol;
  color: Color;
  prevSquare?: Square;
  isCaptured?: boolean;
}

export default function ChessBoardBoard({
  chess,
  flipped,
  selected,
  legal,
  lastMove,
  onSquare,
  promo,
  onPromote,
}: ChessBoardBoardProps) {
  const board = chess.board();
  const checkSquare = chess.inCheck()
    ? chess
        .board()
        .flat()
        .find((c) => c && c.type === 'k' && c.color === chess.turn())?.square ?? null
    : null;

  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const order = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  const captured = { w: [] as PieceSymbol[], b: [] as PieceSymbol[] };
  for (const m of chess.history({ verbose: true })) {
    if (m.captured) captured[m.color].push(m.captured);
  }

  const piecePositions: PiecePosition[] = [];
  for (const r of order) {
    for (const c of order) {
      const sq = squareName(r, c);
      const cell = board[r][c];
      if (cell) {
        const isLastMoveFrom = lastMove?.from === sq;
        const isLastMoveTo = lastMove?.to === sq;
        piecePositions.push({
          square: sq,
          type: cell.type,
          color: cell.color,
          prevSquare: isLastMoveTo ? lastMove.from as Square : undefined,
        });
      }
    }
  }

  return (
    <div
      className="relative [perspective:1200px] [transform-style:preserve-3d]"
      style={{ perspective: '1200px', transformStyle: 'preserve-3d' } as React.CSSProperties}
    >
      <div
        className="relative grid grid-cols-8 w-full aspect-square border-[12px] border-amber-950 poster-shadow bg-[radial-gradient(ellipse_at_center,_#7a4a1f_0%,_#4b2e16_100%)] rounded-[6px] shadow-[inset_0_0_40px_rgba(0,0,0,0.5),_10px_10px_0_0_#0A0A0A] [transform:rotateX(10deg)]"
        role="grid"
        aria-label="Chess board"
        style={{
          transform: 'rotateX(10deg)',
          transformStyle: 'preserve-3d',
        }}
      >
        {order.map((r) =>
          order.map((c) => {
            const sq = squareName(r, c);
            const cell = board[r][c];
            const dark = (r + c) % 2 === 1;
            const move = legal.find((m) => m.to === sq);
            const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq);
            const isCheck = checkSquare === sq;

            const bg = isCheck
              ? 'bg-brand-coral animate-pulse'
              : selected === sq
                ? 'bg-yellow-300'
                : isLast
                  ? dark
                    ? 'bg-lime-600'
                    : 'bg-lime-200'
                  : dark
                    ? 'bg-emerald-800'
                    : 'bg-amber-100';

            const tint = dark ? 'text-amber-100/80' : 'text-emerald-900/70';

            const piece = cell ? piecePositions.find((p) => p.square === sq) : null;
            const isMoving = Boolean(piece?.prevSquare && piece.prevSquare !== sq);
            const transitionClass = prefersReducedMotion
              ? ''
              : isMoving
                ? 'transition-transform duration-300 ease-out'
                : 'transition-transform duration-200 ease-out';

            return (
              <button
                key={sq}
                onClick={() => onSquare(sq)}
                aria-label={`${sq}${cell ? ` ${CAMP_PIECES[cell.type].name} (${SIDES[cell.color].name})` : ' empty'}${move ? ', legal move' : ''}`}
                className={`relative flex items-center justify-center ${bg} focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-purple focus-visible:z-10`}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {c === order[0] && (
                  <span className={`absolute top-0.5 left-0.5 text-[9px] font-bold leading-none ${tint}`}>
                    {8 - r}
                  </span>
                )}
                {r === order[7] && (
                  <span className={`absolute bottom-0.5 right-0.5 text-[9px] font-bold leading-none ${tint}`}>
                    {FILES[c]}
                  </span>
                )}
                {cell && (
                  <PieceToken
                    type={cell.type}
                    color={cell.color}
                    square={sq}
                    isMoving={isMoving}
                    isCaptured={false}
                    prefersReducedMotion={prefersReducedMotion}
                    transitionClass={transitionClass}
                  />
                )}
                {move && !cell && (
                  <span className="absolute w-1/3 h-1/3 rounded-full bg-brand-black/40" />
                )}
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
                {['q', 'r', 'b', 'n'].map((t) => (
                  <button
                    key={t}
                    onClick={() => onPromote(t as PieceSymbol)}
                    className="flex flex-col items-center gap-1 p-2 poster-border bg-brand-cream hover:bg-brand-acid"
                    aria-label={`Promote to ${CAMP_PIECES[t as PieceSymbol].name}`}
                  >
                    <span className="text-3xl leading-none">{CAMP_PIECES[t as PieceSymbol].emoji}</span>
                    <span className="font-display font-bold text-[9px] uppercase leading-tight">
                      {CAMP_PIECES[t as PieceSymbol].name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <CapturedPieces
        captured={captured}
        prefersReducedMotion={prefersReducedMotion}
      />
    </div>
  );
}

interface PieceTokenProps {
  type: PieceSymbol;
  color: Color;
  square: Square;
  isMoving: boolean;
  isCaptured: boolean;
  prefersReducedMotion: boolean;
  transitionClass: string;
}

function PieceToken({
  type,
  color,
  square,
  isMoving,
  isCaptured,
  prefersReducedMotion,
  transitionClass,
}: PieceTokenProps) {
  const p = CAMP_PIECES[type];

  if (prefersReducedMotion) {
    return (
      <span
        className={`relative flex items-center justify-center w-[84%] h-[84%] rounded-full border-2 border-brand-black text-[clamp(18px,5.2vw,32px)] leading-none select-none ${
          color === 'w' ? 'bg-brand-acid' : 'bg-brand-purple'
        } ${transitionClass}`}
        title={`${p.name} (${p.role})`}
        style={{
          transform: isCaptured ? 'translateX(200%) rotate(45deg) scale(0.5)' : 'none',
          opacity: isCaptured ? 0 : 1,
        }}
      >
        {p.emoji}
        <span className="absolute -bottom-1 -right-1 flex items-center justify-center w-[42%] h-[42%] rounded-full bg-brand-black text-brand-cream font-display font-black text-[clamp(8px,2.3vw,12px)] leading-none">
          {PIECE_LETTER[type]}
        </span>
      </span>
    );
  }

  return (
    <span
      className={`relative flex items-center justify-center w-[84%] h-[84%] rounded-full border-2 border-brand-black text-[clamp(18px,5.2vw,32px)] leading-none select-none ${
        color === 'w' ? 'bg-brand-acid' : 'bg-brand-purple'
      } ${transitionClass}`}
      title={`${p.name} (${p.role})`}
      style={{
        transform: isMoving
          ? 'translateZ(40px) scale(1.1)'
          : isCaptured
            ? 'translateX(200%) rotate(45deg) scale(0.5)'
            : 'translateZ(20px)',
        transition: isMoving
          ? 'transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          : isCaptured
            ? 'transform 400ms cubic-bezier(0.55, 0.085, 0.68, 0.53), opacity 400ms ease-out'
            : 'transform 200ms ease-out',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        opacity: isCaptured ? 0 : 1,
      }}
    >
      {p.emoji}
      <span className="absolute -bottom-1 -right-1 flex items-center justify-center w-[42%] h-[42%] rounded-full bg-brand-black text-brand-cream font-display font-black text-[clamp(8px,2.3vw,12px)] leading-none">
        {PIECE_LETTER[type]}
      </span>
      <span
        className="absolute -top-1 -left-1 w-full h-full rounded-full bg-brand-black/10 blur-[4px]"
        style={{
          transform: 'translateZ(-2px)',
          filter: 'blur(4px)',
        }}
      />
    </span>
  );
}

interface CapturedPiecesProps {
  captured: { w: PieceSymbol[]; b: PieceSymbol[] };
  prefersReducedMotion: boolean;
}

function CapturedPieces({ captured, prefersReducedMotion }: CapturedPiecesProps) {
  return (
    <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-10">
      {captured.w.length > 0 && (
        <div
          className="flex gap-1"
          style={{
            transform: prefersReducedMotion ? 'none' : 'translateX(0)',
            transition: prefersReducedMotion ? 'none' : 'transform 400ms cubic-bezier(0.55, 0.085, 0.68, 0.53)',
            willChange: 'transform',
          }}
        >
          {captured.w.map((t, i) => (
            <CapturedToken key={`${t}-${i}`} type={t} color="w" index={i} prefersReducedMotion={prefersReducedMotion} />
          ))}
        </div>
      )}
      {captured.b.length > 0 && (
        <div
          className="flex gap-1"
          style={{
            transform: prefersReducedMotion ? 'none' : 'translateX(0)',
            transition: prefersReducedMotion ? 'none' : 'transform 400ms cubic-bezier(0.55, 0.085, 0.68, 0.53)',
            willChange: 'transform',
          }}
        >
          {captured.b.map((t, i) => (
            <CapturedToken key={`${t}-${i}`} type={t} color="b" index={i} prefersReducedMotion={prefersReducedMotion} />
          ))}
        </div>
      )}
    </div>
  );
}

interface CapturedTokenProps {
  type: PieceSymbol;
  color: Color;
  index: number;
  prefersReducedMotion: boolean;
}

function CapturedToken({ type, color, index, prefersReducedMotion }: CapturedTokenProps) {
  const p = CAMP_PIECES[type];
  const delay = index * 50;

  return (
    <span
      className={`relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-brand-black text-[clamp(16px,4vw,24px)] leading-none select-none ${
        color === 'w' ? 'bg-brand-acid' : 'bg-brand-purple'
      }`}
      title={`${p.name} (captured)`}
      style={{
        transform: prefersReducedMotion
          ? 'none'
          : `translateX(${color === 'w' ? -100 - index * 30 : 100 + index * 30}px) translateY(-20px) rotate(${color === 'w' ? -30 : 30}deg) scale(0.7)`,
        transition: prefersReducedMotion
          ? 'none'
          : `transform 400ms cubic-bezier(0.55, 0.085, 0.68, 0.53) ${delay}ms, opacity 400ms ease-out ${delay}ms`,
        opacity: prefersReducedMotion ? 1 : 0.7,
        willChange: 'transform, opacity',
      }}
    >
      {p.emoji}
    </span>
  );
}