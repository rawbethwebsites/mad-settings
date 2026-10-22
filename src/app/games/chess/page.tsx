'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { getPlayer, addScore, addBadge, Player } from '@/lib/player';
import { chooseMove } from '@/lib/chessAi';
import {
  CAMP_PIECES,
  PIECE_LETTER,
  SIDES,
  LEVELS,
  DRAW_POINTS,
  ONLINE_WIN_POINTS,
  type ChessLevel,
} from '@/data/chessPieces';
import ChessBoard, { PlayerStrip, capturedBy } from '@/components/chess/ChessBoard';
import OnlineChess from '@/components/chess/OnlineChess';
import SoundToggle, { buttonTap } from '@/components/arcade/SoundControls';
import { play } from '@/lib/sfx';
import { useResultSound } from '@/lib/useGameSounds';

type Mode = 'ai' | 'online';
type Phase = 'setup' | 'play';

interface Result {
  title: string;
  detail: string;
  winner: Color | null;
  points: number;
}

const SET: PieceSymbol[] = ['k', 'q', 'r', 'b', 'n', 'p'];

function Legend({ compact }: { compact?: boolean }) {
  return (
    <div className={`grid gap-2 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'}`}>
      {SET.map(t => (
        <div key={t} className="flex items-start gap-2 p-2 bg-white border-2 border-brand-black/15">
          <span className="text-2xl leading-none">{CAMP_PIECES[t].emoji}</span>
          <span className="font-body text-sm leading-tight">
            <b className="font-display uppercase">{CAMP_PIECES[t].name}</b>{' '}
            <span className="text-brand-black/50">
              ({CAMP_PIECES[t].role} · {PIECE_LETTER[t]})
            </span>
            {compact && (
              <>
                <br />
                {CAMP_PIECES[t].blurb}
              </>
            )}
          </span>
        </div>
      ))}
    </div>
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
  const [tick, setTick] = useState(0);
  const [selected, setSelected] = useState<Square | null>(null);
  const [pendingPromo, setPendingPromo] = useState<{ from: Square; to: Square } | null>(null);
  const [thinking, setThinking] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  useResultSound(result ? (result.winner === null ? 'draw' : result.winner === human ? 'win' : 'lose') : null);

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
        const moved = game.move(move);
        play(moved.captured ? 'capture' : 'place');
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
  }, [aiTurn, game, level, tick]);

  if (!mounted || !player) return null;

  // Check for the end of the game and award points once
  function settle() {
    if (!game.isGameOver()) return;
    let res: Result;
    if (game.isCheckmate()) {
      const winner: Color = game.turn() === 'w' ? 'b' : 'w';
      const humanWon = winner === human;
      const points = humanWon ? LEVELS.find(l => l.id === level)?.win ?? 0 : 0;
      res = {
        title: humanWon ? `${SIDES[winner].name} WIN!` : 'CAMPFIRE OUT!',
        detail: humanWon
          ? `${SIDES[winner === 'w' ? 'b' : 'w'].name}' campfire is trapped. Checkmate.`
          : 'The computer snuffed your campfire. Rematch?',
        winner,
        points,
      };
      if (humanWon && level === 'hard') addBadge('♟️');
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
    if (mode === 'online') {
      setPhase('play');
      return;
    }
    const side: Color = pickSide === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : pickSide;
    setGame(new Chess());
    setHuman(side);
    setFlipped(side === 'b');
    setSelected(null);
    setPendingPromo(null);
    setResult(null);
    setThinking(false);
    setPhase('play');
  };

  const playMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    try {
      const moved = game.move({ from, to, promotion });
      play(moved.captured ? 'capture' : 'place');
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
    if (result || thinking || pendingPromo || turn !== human) return;
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
    if (game.turn() !== human) game.undo();
    setSelected(null);
    setPendingPromo(null);
    setTick(t => t + 1);
  };

  const history = game.history({ verbose: true });
  const last = history[history.length - 1];
  const captured = capturedBy(game);
  const top: Color = flipped ? 'w' : 'b';
  const bottom: Color = flipped ? 'b' : 'w';
  const whoLabel = (c: Color) => (c === human ? `YOU · ${SIDES[c].name}` : `COMPUTER · ${SIDES[c].name}`);
  const statusText = result ? result.title : thinking ? 'COMPUTER IS THINKING…' : `${whoLabel(turn)} TO MOVE`;
  const inCheck = game.inCheck();

  return (
    <main onClick={buttonTap} className="min-h-screen bg-brand-cream text-brand-black p-4 md:p-6">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center gap-2 mb-6">
          <button
            onClick={() => (phase === 'play' && mode === 'online' ? setPhase('setup') : router.push('/games'))}
            className="font-display font-bold text-sm uppercase hover:text-brand-purple"
          >
            ← BACK
          </button>
          <h1 className="font-display font-black text-xl sm:text-2xl md:text-3xl uppercase italic">♟️ CAMP CHESS</h1>
          <SoundToggle />
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
                { id: 'online', label: 'ANOTHER CAMPER', sub: 'Each on your own phone' },
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

            {mode === 'online' && (
              <p className="font-body text-sm text-brand-black/60 mb-6">
                See which campers are online and invite one. You each play on your own phone. Winning earns {ONLINE_WIN_POINTS} pts.
              </p>
            )}

            <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50 mb-2">THE CAMP SET</div>
            <div className="mb-6">
              <Legend />
            </div>

            <button
              onClick={start}
              className="w-full py-4 bg-brand-purple text-brand-cream font-display font-black uppercase text-lg poster-border poster-shadow hover:-translate-y-1 transition-transform"
            >
              {mode === 'online' ? 'FIND CAMPERS →' : 'START →'}
            </button>
          </div>
        )}

        {/* Live game against another camper */}
        {phase === 'play' && mode === 'online' && <OnlineChess player={player} />}

        {/* Game against the computer */}
        {phase === 'play' && mode === 'ai' && (
          <>
            <div className="mb-2">
              <PlayerStrip color={top} label={whoLabel(top)} active={turn === top && !result} captured={captured[top]} />
            </div>

            <ChessBoard
              chess={game}
              flipped={flipped}
              selected={selected}
              legal={legal}
              lastMove={last ? { from: last.from, to: last.to } : null}
              onSquare={onSquare}
              promo={pendingPromo}
              onPromote={t => pendingPromo && playMove(pendingPromo.from, pendingPromo.to, t)}
            />

            <div className="mt-2">
              <PlayerStrip color={bottom} label={whoLabel(bottom)} active={turn === bottom && !result} captured={captured[bottom]} />
            </div>

            <div
              aria-live="polite"
              className={`mt-4 p-3 poster-border text-center font-display font-black uppercase ${
                inCheck && !result ? 'bg-brand-coral' : 'bg-white'
              }`}
            >
              {statusText}
              {inCheck && !result && <div className="text-sm">🔥 CAMPFIRE IN DANGER!</div>}
            </div>

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

            {result && (
              <div
                className={`mt-6 p-8 poster-border poster-shadow text-center ${
                  result.winner === null ? 'bg-brand-cyan' : result.winner !== human ? 'bg-brand-coral' : 'bg-brand-acid'
                }`}
              >
                <div className="text-6xl mb-3">
                  {result.winner === null ? '🤝' : result.winner !== human ? '🌑' : '🏆'}
                </div>
                <h2 className="font-display font-black text-3xl uppercase italic mb-2">{result.title}</h2>
                <p className="font-body text-lg mb-2">{result.detail}</p>
                {result.points > 0 && <p className="font-display font-black text-xl mb-4">+{result.points} PTS</p>}
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

        {/* Piece guide, always one tap away during a game */}
        {phase === 'play' && (
          <>
            <button
              onClick={() => setShowLegend(s => !s)}
              aria-expanded={showLegend}
              className="w-full mt-4 py-2 font-display font-bold uppercase text-xs tracking-widest text-brand-black/60 hover:text-brand-purple"
            >
              {showLegend ? '▾ HIDE' : '▸ SHOW'} THE CAMP SET
            </button>
            {showLegend && (
              <div className="mt-2">
                <Legend compact />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
