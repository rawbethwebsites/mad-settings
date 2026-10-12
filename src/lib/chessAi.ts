import { Chess, type Move, type PieceSymbol } from 'chess.js';
import type { ChessLevel } from '@/data/chessPieces';

const VALUE: Record<PieceSymbol, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const MATE = 100000;

// Small bonus for holding the middle of the board
const centre = (file: number, rank: number) => {
  const df = Math.min(file, 7 - file);
  const dr = Math.min(rank, 7 - rank);
  return (df + dr) * 4;
};

// Score from the point of view of the side to move
function evaluate(chess: Chess): number {
  let score = 0;
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = board[r][f];
      if (!sq) continue;
      const v = VALUE[sq.type] + (sq.type === 'k' ? 0 : centre(f, r));
      score += sq.color === 'w' ? v : -v;
    }
  }
  return chess.turn() === 'w' ? score : -score;
}

function order(moves: Move[]): Move[] {
  const rank = (m: Move) =>
    (m.captured ? 10 * VALUE[m.captured] - VALUE[m.piece] : 0) + (m.promotion ? VALUE[m.promotion] : 0);
  return [...moves].sort((a, b) => rank(b) - rank(a));
}

class OutOfTime extends Error {}

function negamax(chess: Chess, depth: number, alpha: number, beta: number, ply: number, deadline: number): number {
  // Leaves are the hot path: skip move generation there
  if (depth === 0) return evaluate(chess);
  if (Date.now() > deadline) throw new OutOfTime();
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return chess.inCheck() ? -MATE + ply : 0;
  if (chess.isInsufficientMaterial()) return 0;

  let best = -Infinity;
  for (const m of order(moves)) {
    chess.move(m);
    const score = -negamax(chess, depth - 1, -beta, -alpha, ply + 1, deadline);
    chess.undo();
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

// Search deeper until the depth cap or the time budget runs out
const SEARCH: Record<ChessLevel, { depth: number; ms: number }> = {
  easy: { depth: 1, ms: 0 },
  medium: { depth: 2, ms: 1200 },
  hard: { depth: 4, ms: 1500 },
};

export function chooseMove(fen: string, level: ChessLevel): Move | null {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  // Rookie blunders now and then
  if (level === 'easy' && Math.random() < 0.3) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const { depth: maxDepth, ms } = SEARCH[level];
  const started = Date.now();
  let ordered = order(moves);
  let choice: Move = ordered[0];

  for (let depth = 1; depth <= maxDepth; depth++) {
    // Depth 1 always finishes so there is always a sensible move
    const deadline = depth === 1 ? Infinity : started + ms;
    let bestScore = -Infinity;
    let best: Move[] = [];
    const scored: { m: Move; score: number }[] = [];
    try {
      for (const m of ordered) {
        chess.move(m);
        // Always take a mate in one, whatever the level
        const score = chess.isCheckmate() ? MATE : -negamax(chess, depth - 1, -Infinity, Infinity, 1, deadline);
        chess.undo();
        scored.push({ m, score });
        if (score > bestScore) {
          bestScore = score;
          best = [m];
        } else if (score === bestScore) {
          best.push(m);
        }
      }
    } catch (e) {
      if (!(e instanceof OutOfTime)) throw e;
      chess.undo();
      break;
    }
    choice = best[Math.floor(Math.random() * best.length)];
    if (bestScore >= MATE - 100) break;
    // Best moves first next round for better pruning
    ordered = scored.sort((a, b) => b.score - a.score).map(x => x.m);
  }
  return choice;
}
