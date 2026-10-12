'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { getPlayer, addScore, addBadge, Player } from '@/lib/player';
import { chooseMove } from '@/lib/chessAi';
import {
  CAMP_PIECES,
  SIDES,
  PROMOTION_CHOICES,
  LEVELS,
  DRAW_POINTS,
  TWO_PLAYER_WIN_POINTS,
  type ChessLevel,
} from '@/data/chessPieces';

type Mode = 'ai' | 'two';
type Phase = 'setup' | 'play';

interface Result {
  title: string;
  detail: string;
  winner: Color | null;
  points: number;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const squareName = (row: number, col: number) => `${FILES[col]}${8 - row}` as Square;

function Token({ type, color }: { type: PieceSymbol; color: Color }) {
  const p = CAMP_PIECES[type];
  return (
    <span
      className={`flex items-center justify-center w-[84%] h-[84%] rounded-full border-2 border-brand-black text-[clamp(18px,5.2vw,32px)] leading-none select-none ${
        color === 'w' ? 'bg-brand-acid' : 'bg-brand-purple'
      }`}
      title={`${p.name} (${p.role})`}
    >
      {p.emoji}
    </span>
  );
}

export default function CampChess() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [mounted, setMounted] = useState(false);

  const [phase, setPhase] = useState<Phase>('setup');
  const [mode, setMode] = useState<Mode>('ai');
  const [level, setLevel] = useState<ChessLevel>('medium');
  const [pickSide, setPickSide] = useState<Color | 'random'>('w');
  const [human, setHuman] = useState<Color>('w');
  const [flipped, setFlipped] = useState(false);

  // chess.js instance is mutated in place; `tick` re-renders after each change
  const [game, setGame] = useState(() => new Chess());
  const [, setTick] = useState(0);
  const [selected, setSelected] = useState<Square | null>(null);
  const [pendingPromo, setPendingPromo] = useState<{ from: Square; to: Square } | null>(null);
  const [thinking, setThinking] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    const p = getPlayer();
    if (!p) { router.push('/join'); return; }
    const timer = window.setTimeout(() => {
      setPlayer(p);
      setMounted(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router]);

  const turn = game.turn();
  const aiTurn = phase === 'play' && mode === 'ai' && !result && turn !== human;

  // Computer's move
  useEffect(() => {
    if (!aiTurn) return;
    const start = window.setTimeout(() => setThinking(true), 0);
    const timer = window.setTimeout(() => {
      const move = chooseMove(game.fen(), level);
      if (move) {
        game.move(move);
        setTick(t => t + 1);
        settle();
      }
      setThinking(false);
    }, 450);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiTurn, game, level, game.fen()]);

  if (!mounted || !player) return null;

  // Check for the end of the game and award points once
  function settle() {
    if (!game.isGameOver()) return;
    let res: Result;
    if (game.isCheckmate()) {
      const winner: Color = game.turn() === 'w' ? 'b' : 'w';
      const humanWon = mode === 'ai' ? winner === human : true;
      let points = 0;
      if (mode === 'two') points = TWO_PLAYER_WIN_POINTS;
      else if (humanWon) points = LEVELS.find(l => l.id === level)?.win ?? 0;
      res = {
        title: mode === 'ai' && !humanWon ? 'CAMPFIRE OUT!' : `${SIDES[winner].name} WIN!`,
        detail:
          mode === 'ai' && !humanWon
            ? 'The computer snuffed your campfire. Rematch?'
            : `${SIDES[winner === 'w' ? 'b' : 'w'].name}' campfire is trapped. Checkmate.`,
        winner,
        points,
      };
      if (mode === 'ai' && humanWon && level === 'hard') addBadge('♟️');
    } else {
      const why = game.isStalemate()
        ? 'Stalemate. Nobody can move.'
        : game.isInsufficientMaterial()
          ? 'Not enough pieces left to finish the job.'
          : game.isThreefoldRepetition()
            ? 'Same position three times.'
            : 'Fifty moves with no progress.';
      res = { title: 'DRAW', detail: why, winner: null, points: DRAW_POINTS };
    }
    if (res.points > 0) addScore('chess', res.points);
    setPlayer(getPlayer());
    setResult(res);
  }

  const start = () => {
    const side: Color = pickSide === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : pickSide;
    const g = new Chess();
    setGame(g);
    setHuman(mode === 'ai' ? side : 'w');
    setFlipped(mode === 'ai' && side === 'b');
    setSelected(null);
    setPendingPromo(null);
    setResult(null);
    setThinking(false);
    setPhase('play');
  };

  const playMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    try {
      game.move({ from, to, promotion });
    } catch {
      return;
    }
    setSelected(null);
    setPendingPromo(null);
    setTick(t => t + 1);
    settle();
  };

  const legal: Move[] = selected ? game.moves({ square: selected, verbose: true }) : [];

  const onSquare = (sq: Square) => {
    if (result || thinking || pendingPromo) return;
    if (mode === 'ai' && turn !== human) return;

    const target = legal.filter(m => m.to === sq);
    if (selected && target.length > 0) {
      if (target.some(m => m.promotion)) setPendingPromo({ from: selected, to: sq });
      else playMove(selected, sq);
      return;
    }
    const piece = game.get(sq);
    setSelected(piece && piece.color === turn ? sq : null);
  };

  const undo = () => {
    if (result || thinking) return;
    if (game.history().length === 0) return;
    game.undo();
    if (mode === 'ai' && game.turn() !== human) game.undo();
    setSelected(null);
    setPendingPromo(null);
    setTick(t => t + 1);
  };

  const history = game.history({ verbose: true });
  const last = history[history.length - 1];
  const board = game.board();
  const inCheck = game.inCheck();
  let checkSquare: Square | null = null;
  if (inCheck) {
    for (const row of board) for (const c of row) if (c && c.type === 'k' && c.color === turn) checkSquare = c.square;
  }

  const captured: Record<Color, PieceSymbol[]> = { w: [], b: [] };
  for (const m of history) if (m.captured) captured[m.color].push(m.captured);

  const rows = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  const whoLabel = (c: Color) =>
    mode === 'ai' ? (c === human ? `YOU · ${SIDES[c].name}` : `COMPUTER · ${SIDES[c].name}`) : SIDES[c].name;

  const statusText = result
    ? result.title
    : thinking
      ? 'COMPUTER IS THINKING…'
      : `${whoLabel(turn)} TO MOVE`;

  return (
    <main className="min-h-screen bg-brand-cream text-brand-black p-4 md:p-6">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => router.push('/games')} className="font-display font-bold text-sm uppercase hover:text-brand-purple">
            ← BACK
          </button>
          <h1 className="font-display font-black text-2xl md:text-3xl uppercase italic">♟️ CAMP CHESS</h1>
          <div className="font-display font-black text-xl">{player.avatar}</div>
        </div>

        {/* Setup */}
        {phase === 'setup' && (
          <div className="p-6 md:p-8 poster-border poster-shadow bg-white">
            <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50 mb-2">HOW TO PLAY</div>
            <p className="font-body text-lg mb-6">
              Real chess, camp edition. Protect your <b>🔥 Campfire</b> and trap theirs. Tap a piece, then tap where it goes.
            </p>

            <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50 mb-2">WHO ARE YOU PLAYING?</div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {([
                { id: 'ai', label: 'THE COMPUTER', sub: 'Solo play' },
                { id: 'two', label: 'ANOTHER CAMPER', sub: 'Pass the phone' },
              ] as { id: Mode; label: string; sub: string }[]).map(o => (
                <button
                  key={o.id}
                  onClick={() => setMode(o.id)}
                  aria-pressed={mode === o.id}
                  className={`p-4 poster-border text-left transition-colors ${
                    mode === o.id ? 'bg-brand-black text-brand-cream' : 'bg-white text-brand-black'
                  }`}
                >
                  <div className="font-display font-black uppercase text-lg leading-tight">{o.label}</div>
                  <div className="font-body text-sm opacity-70">{o.sub}</div>
                </button>
              ))}
            </div>

            {mode === 'ai' && (
              <>
                <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50 mb-2">DIFFICULTY</div>
                <div className="grid grid-cols-3 gap-3 mb-2">
                  {LEVELS.map(l => (
                    <button
                      key={l.id}
                      onClick={() => setLevel(l.id)}
                      aria-pressed={level === l.id}
                      className={`py-3 px-2 poster-border font-display font-black uppercase text-sm ${
                        level === l.id ? 'bg-brand-purple text-brand-cream' : 'bg-white text-brand-black'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
                <p className="font-body text-sm text-brand-black/60 mb-6">
                  {LEVELS.find(l => l.id === level)?.blurb} Win for {LEVELS.find(l => l.id === level)?.win} pts.
                </p>

                <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50 mb-2">YOUR SIDE</div>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {([
                    { id: 'w', label: 'DAY', chip: 'bg-brand-acid' },
                    { id: 'b', label: 'NIGHT', chip: 'bg-brand-purple text-brand-cream' },
                    { id: 'random', label: 'RANDOM', chip: 'bg-white' },
                  ] as { id: Color | 'random'; label: string; chip: string }[]).map(o => (
                    <button
                      key={o.id}
                      onClick={() => setPickSide(o.id)}
                      aria-pressed={pickSide === o.id}
                      className={`py-3 poster-border font-display font-black uppercase text-sm ${o.chip} ${
                        pickSide === o.id ? 'ring-4 ring-brand-black ring-offset-2' : 'opacity-70'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {mode === 'two' && (
              <p className="font-body text-sm text-brand-black/60 mb-6">
                Day Campers (green) move first. Hand the phone over after every move. Winning earns {TWO_PLAYER_WIN_POINTS} pts.
              </p>
            )}

            {/* Piece legend */}
            <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50 mb-2">THE CAMP SET</div>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {(['k', 'q', 'r', 'b', 'n', 'p'] as PieceSymbol[]).map(t => (
                <div key={t} className="flex items-start gap-2 p-2 border-2 border-brand-black/15">
                  <span className="text-2xl leading-none">{CAMP_PIECES[t].emoji}</span>
                  <span className="font-body text-sm leading-tight">
                    <b className="font-display uppercase">{CAMP_PIECES[t].name}</b>
                    <br />
                    <span className="text-brand-black/60">{CAMP_PIECES[t].role}</span>
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={start}
              className="w-full py-4 bg-brand-purple text-brand-cream font-display font-black uppercase text-lg poster-border poster-shadow hover:-translate-y-1 transition-transform"
            >
              START →
            </button>
          </div>
        )}

        {/* Play */}
        {phase === 'play' && (
          <>
            {/* Opponent captured + label */}
            {(() => {
              const top: Color = flipped ? 'w' : 'b';
              const bottom: Color = flipped ? 'b' : 'w';
              const strip = (c: Color) => (
                <div className="flex items-center justify-between gap-2 min-h-8">
                  <span className={`px-2 py-1 font-display font-black text-xs uppercase poster-border ${SIDES[c].chip} ${turn === c && !result ? 'ring-2 ring-brand-black ring-offset-1' : ''}`}>
                    {whoLabel(c)}
                  </span>
                  <span className="flex flex-wrap justify-end gap-0.5 text-lg leading-none" aria-label="Captured pieces">
                    {/* pieces this side has taken from the other */}
                    {captured[c].map((t, i) => (
                      <span key={i}>{CAMP_PIECES[t].emoji}</span>
                    ))}
                  </span>
                </div>
              );
              return (
                <>
                  <div className="mb-2">{strip(top)}</div>

                  <div
                    className="relative grid grid-cols-8 w-full aspect-square border-4 border-brand-black poster-shadow bg-brand-black"
                    role="grid"
                    aria-label="Chess board"
                  >
                    {rows.map(r =>
                      cols.map(c => {
                        const sq = squareName(r, c);
                        const cell = board[r][c];
                        const dark = (r + c) % 2 === 1;
                        const move = legal.find(m => m.to === sq);
                        const isSel = selected === sq;
                        const isLast = last && (last.from === sq || last.to === sq);
                        const isCheck = checkSquare === sq;
                        const bg = isCheck
                          ? 'bg-brand-coral'
                          : isSel
                            ? 'bg-yellow-300'
                            : isLast
                              ? dark ? 'bg-lime-600' : 'bg-lime-200'
                              : dark ? 'bg-emerald-800' : 'bg-amber-100';
                        const showRank = c === cols[0];
                        const showFile = r === rows[7];
                        return (
                          <button
                            key={sq}
                            onClick={() => onSquare(sq)}
                            aria-label={`${sq}${cell ? ` ${CAMP_PIECES[cell.type].name} (${SIDES[cell.color].name})` : ' empty'}${move ? ', legal move' : ''}`}
                            className={`relative flex items-center justify-center ${bg} transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-purple focus-visible:z-10`}
                          >
                            {showRank && (
                              <span className={`absolute top-0.5 left-0.5 text-[9px] font-bold leading-none ${dark ? 'text-amber-100/80' : 'text-emerald-900/70'}`}>{8 - r}</span>
                            )}
                            {showFile && (
                              <span className={`absolute bottom-0.5 right-0.5 text-[9px] font-bold leading-none ${dark ? 'text-amber-100/80' : 'text-emerald-900/70'}`}>{FILES[c]}</span>
                            )}
                            {cell && <Token type={cell.type} color={cell.color} />}
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

                    {/* Promotion chooser */}
                    {pendingPromo && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center bg-brand-black/70 p-4">
                        <div className="bg-white poster-border p-4 text-center w-full max-w-xs">
                          <div className="font-display font-black uppercase mb-3">LEVEL UP YOUR LOG!</div>
                          <div className="grid grid-cols-4 gap-2">
                            {PROMOTION_CHOICES.map(t => (
                              <button
                                key={t}
                                onClick={() => playMove(pendingPromo.from, pendingPromo.to, t)}
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

                  <div className="mt-2">{strip(bottom)}</div>
                </>
              );
            })()}

            {/* Status */}
            <div
              aria-live="polite"
              className={`mt-4 p-3 poster-border text-center font-display font-black uppercase ${
                inCheck && !result ? 'bg-brand-coral' : 'bg-white'
              }`}
            >
              {statusText}
              {inCheck && !result && <div className="text-sm">🔥 CAMPFIRE IN DANGER!</div>}
            </div>

            {/* Controls */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <button
                onClick={undo}
                disabled={history.length === 0 || thinking || !!result}
                className="py-3 poster-border bg-white font-display font-black uppercase text-sm disabled:opacity-40"
              >
                ↩ UNDO
              </button>
              <button
                onClick={() => setFlipped(f => !f)}
                className="py-3 poster-border bg-white font-display font-black uppercase text-sm"
              >
                ⇅ FLIP
              </button>
              <button
                onClick={() => setPhase('setup')}
                className="py-3 poster-border bg-white font-display font-black uppercase text-sm"
              >
                NEW GAME
              </button>
            </div>

            <button
              onClick={() => setShowLegend(s => !s)}
              aria-expanded={showLegend}
              className="w-full mt-4 py-2 font-display font-bold uppercase text-xs tracking-widest text-brand-black/60 hover:text-brand-purple"
            >
              {showLegend ? '▾ HIDE' : '▸ SHOW'} THE CAMP SET
            </button>
            {showLegend && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {(['k', 'q', 'r', 'b', 'n', 'p'] as PieceSymbol[]).map(t => (
                  <div key={t} className="flex items-start gap-2 p-2 bg-white border-2 border-brand-black/15">
                    <span className="text-2xl leading-none">{CAMP_PIECES[t].emoji}</span>
                    <span className="font-body text-sm leading-tight">
                      <b className="font-display uppercase">{CAMP_PIECES[t].name}</b>{' '}
                      <span className="text-brand-black/50">({CAMP_PIECES[t].role})</span>
                      <br />
                      {CAMP_PIECES[t].blurb}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Result */}
            {result && (
              <div
                className={`mt-6 p-8 poster-border poster-shadow text-center ${
                  result.winner === null
                    ? 'bg-brand-cyan'
                    : mode === 'ai' && result.winner !== human
                      ? 'bg-brand-coral'
                      : 'bg-brand-acid'
                }`}
              >
                <div className="text-6xl mb-3">
                  {result.winner === null ? '🤝' : mode === 'ai' && result.winner !== human ? '🌑' : '🏆'}
                </div>
                <h2 className="font-display font-black text-3xl uppercase italic mb-2">{result.title}</h2>
                <p className="font-body text-lg mb-2">{result.detail}</p>
                {result.points > 0 && (
                  <p className="font-display font-black text-xl mb-4">+{result.points} PTS</p>
                )}
                <div className="flex gap-3 mt-4">
                  <button onClick={() => router.push('/games')} className="flex-1 py-3 bg-brand-cream text-brand-black font-display font-black uppercase poster-border">
                    GAME HUB
                  </button>
                  <button onClick={start} className="flex-1 py-3 bg-brand-black text-brand-cream font-display font-black uppercase poster-border">
                    REMATCH →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
