'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConvexProvider, ConvexReactClient, useMutation, useQuery } from 'convex/react';
import { readableErrors } from '@/lib/readableErrors';
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { addScore, type Player } from '@/lib/player';
import { claimAward, getChessPlayerId } from '@/lib/chessOnline';
import { DRAW_POINTS, ONLINE_WIN_POINTS, SIDES } from '@/data/chessPieces';
import ChessBoard, { PlayerStrip, capturedBy } from './ChessBoard';

const btn = 'font-display font-black uppercase poster-border';

function replay(moves: string[]) {
  const chess = new Chess();
  for (const m of moves) chess.move(m);
  return chess;
}

export default function OnlineChess({ player }: { player: Player }) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  const client = useMemo(() => (url ? readableErrors(new ConvexReactClient(url)) : null), [url]);

  if (!client) {
    return (
      <div className="p-6 poster-border bg-brand-coral text-brand-black font-display font-bold">
        Online play isn&apos;t switched on for this site yet.
      </div>
    );
  }
  return (
    <ConvexProvider client={client}>
      <Online player={player} />
    </ConvexProvider>
  );
}

function Online({ player }: { player: Player }) {
  const [playerId] = useState(() => getChessPlayerId());
  const [localCode, setLocalCode] = useState<string | null>(null);
  const [leftCodes, setLeftCodes] = useState<string[]>([]);
  const [side, setSide] = useState<Color | 'random'>('random');
  const [error, setError] = useState<string | null>(null);

  const ping = useMutation(api.chess.ping);
  const invite = useMutation(api.chess.invite);
  const accept = useMutation(api.chess.accept);
  const decline = useMutation(api.chess.decline);
  const cancel = useMutation(api.chess.cancel);

  const online = useQuery(api.chess.online, { playerId });
  const incoming = useQuery(api.chess.incoming, { playerId });
  const outgoing = useQuery(api.chess.outgoing, { playerId });
  const active = useQuery(api.chess.activeGame, { playerId });

  // Pick up a game after a refresh or a locked phone
  const resumeCode = active && !leftCodes.includes(active) ? active : null;
  const gameCode = localCode && !leftCodes.includes(localCode) ? localCode : resumeCode;

  // Presence heartbeat: tells everyone else you're here (and whether you're busy)
  const busy = !!gameCode;
  useEffect(() => {
    const beat = () => {
      ping({ playerId, name: player.name, avatar: player.avatar, busy }).catch(() => {});
    };
    beat();
    const t = window.setInterval(beat, 15000);
    return () => window.clearInterval(t);
  }, [ping, playerId, player.name, player.avatar, busy]);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      // Convex wraps server errors; show just the human part
      const m = msg.match(/Uncaught Error: (.+?)(?:\n|$)/);
      setError(m ? m[1] : 'Something went wrong. Try again.');
    }
  };

  const leave = (code: string) => {
    setLeftCodes(l => [...l, code]);
    setLocalCode(null);
  };

  if (gameCode) {
    return (
      <Game
        code={gameCode}
        playerId={playerId}
        player={player}
        declined={outgoing?.code === gameCode && (outgoing.status === 'declined' || outgoing.status === 'cancelled')}
        inviteId={outgoing?.code === gameCode ? outgoing.id : null}
        onLeave={() => leave(gameCode)}
      />
    );
  }

  return (
    <div>
      {/* Invites for me */}
      {incoming && incoming.length > 0 && (
        <div className="space-y-3 mb-6">
          {incoming.map(inv => (
            <div key={inv.id} className="p-4 poster-border poster-shadow bg-brand-acid">
              <div className="font-display font-black uppercase text-lg">
                {inv.fromAvatar} {inv.fromName} wants to play chess!
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <button
                  onClick={() =>
                    run(async () => {
                      const r = await accept({ inviteId: inv.id, playerId, name: player.name, avatar: player.avatar });
                      setLocalCode(r.code);
                    })
                  }
                  className={`${btn} py-3 bg-brand-black text-brand-cream`}
                >
                  ✓ PLAY
                </button>
                <button
                  onClick={() => run(async () => { await decline({ inviteId: inv.id, playerId }); })}
                  className={`${btn} py-3 bg-white text-brand-black`}
                >
                  ✗ NO THANKS
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div role="alert" className="p-3 mb-4 poster-border bg-brand-coral font-display font-bold text-sm">
          {error}
        </div>
      )}

      <div className="p-6 poster-border poster-shadow bg-white">
        <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50 mb-2">YOU PLAY AS</div>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {([
            { id: 'w', label: 'DAY', chip: 'bg-brand-acid' },
            { id: 'b', label: 'NIGHT', chip: 'bg-brand-purple text-brand-cream' },
            { id: 'random', label: 'RANDOM', chip: 'bg-white' },
          ] as { id: Color | 'random'; label: string; chip: string }[]).map(o => (
            <button
              key={o.id}
              onClick={() => setSide(o.id)}
              aria-pressed={side === o.id}
              className={`${btn} py-3 text-sm ${o.chip} ${side === o.id ? 'ring-4 ring-brand-black ring-offset-2' : 'opacity-70'}`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50 mb-2">
          CAMPERS ONLINE NOW
        </div>

        {online === undefined && <p className="font-body text-brand-black/60">Looking for campers…</p>}
        {online && online.length === 0 && (
          <p className="font-body text-lg text-brand-black/70">
            Nobody else is here yet. Ask a camper to open <b>Camp Chess → Another camper</b> on their phone and they&apos;ll show up here.
          </p>
        )}
        {online && online.length > 0 && (
          <ul className="space-y-3">
            {online.map(c => (
              <li key={c.id} className="flex items-center justify-between gap-3 p-3 border-4 border-brand-black">
                <span className="flex items-center gap-3 min-w-0">
                  <span className="text-3xl">{c.avatar}</span>
                  <span className="font-display font-black uppercase truncate">{c.name}</span>
                </span>
                {c.busy ? (
                  <span className="font-display font-bold text-xs uppercase text-brand-black/50 shrink-0">IN A GAME</span>
                ) : (
                  <button
                    onClick={() =>
                      run(async () => {
                        const r = await invite({
                          playerId,
                          name: player.name,
                          avatar: player.avatar,
                          toId: c.id as Id<'chessPresence'>,
                          side,
                        });
                        setLocalCode(r.code);
                      })
                    }
                    className={`${btn} px-4 py-2 bg-brand-purple text-brand-cream text-sm shrink-0`}
                  >
                    INVITE →
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="font-body text-xs text-brand-black/50 text-center mt-4">
        Playing as {player.avatar} {player.name}
      </p>
      <Cancel outgoing={outgoing} cancel={cancel} playerId={playerId} />
    </div>
  );
}

// Clear a dangling invite when the lobby is shown again
function Cancel({
  outgoing,
  cancel,
  playerId,
}: {
  outgoing: { id: Id<'chessInvites'>; status: string } | null | undefined;
  cancel: (a: { inviteId: Id<'chessInvites'>; playerId: string }) => Promise<unknown>;
  playerId: string;
}) {
  useEffect(() => {
    if (outgoing && outgoing.status === 'pending') {
      cancel({ inviteId: outgoing.id, playerId }).catch(() => {});
    }
  }, [outgoing, cancel, playerId]);
  return null;
}

function Game({
  code,
  playerId,
  player,
  declined,
  inviteId,
  onLeave,
}: {
  code: string;
  playerId: string;
  player: Player;
  declined: boolean;
  inviteId: Id<'chessInvites'> | null;
  onLeave: () => void;
}) {
  const game = useQuery(api.chess.get, { code, playerId });
  const move = useMutation(api.chess.move);
  const resign = useMutation(api.chess.resign);
  const rematch = useMutation(api.chess.rematch);
  const cancel = useMutation(api.chess.cancel);

  const [selected, setSelected] = useState<Square | null>(null);
  const [promo, setPromo] = useState<{ from: Square; to: Square } | null>(null);
  const [flipOverride, setFlipOverride] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chess = useMemo(() => replay(game?.moves ?? []), [game?.moves]);

  // Points once per finished game
  const finishedKey = game && game.status === 'finished' ? `${game.code}:${game.round}` : null;
  const resultWinner = game?.result?.winner ?? null;
  const you = game?.you ?? null;
  useEffect(() => {
    if (!finishedKey || !you || !resultWinner) return;
    if (!claimAward(finishedKey)) return;
    const pts = resultWinner === 'draw' ? DRAW_POINTS : resultWinner === you ? ONLINE_WIN_POINTS : 0;
    if (pts > 0) addScore('chess', pts);
  }, [finishedKey, you, resultWinner]);

  if (game === undefined) return <p className="font-body text-center">Loading game…</p>;

  if (game === null || !you) {
    return (
      <div className="p-6 poster-border bg-white text-center">
        <p className="font-body text-lg mb-4">That game isn&apos;t available any more.</p>
        <button onClick={onLeave} className={`${btn} px-6 py-3 bg-brand-black text-brand-cream`}>BACK TO LOBBY</button>
      </div>
    );
  }

  const opp = you === 'w' ? game.black : game.white;
  const flipped = (you === 'b') !== flipOverride;
  const turn = chess.turn();
  const myTurn = game.status === 'playing' && turn === you;
  const captured = capturedBy(chess);
  const top: Color = flipped ? 'w' : 'b';
  const bottom: Color = flipped ? 'b' : 'w';
  const who = (c: Color) => {
    const p = c === 'w' ? game.white : game.black;
    return `${p ? `${p.avatar} ${p.name}` : '…'}${c === you ? ' (YOU)' : ''}`;
  };

  // Waiting for the invited camper to answer
  if (game.status === 'waiting') {
    return (
      <div className="p-8 poster-border poster-shadow bg-white text-center">
        {declined ? (
          <>
            <div className="text-5xl mb-3">🙈</div>
            <h2 className="font-display font-black text-2xl uppercase mb-4">They can&apos;t play right now</h2>
            <button onClick={onLeave} className={`${btn} px-6 py-3 bg-brand-black text-brand-cream`}>BACK TO LOBBY</button>
          </>
        ) : (
          <>
            <div className="text-5xl mb-3 animate-pulse">⏳</div>
            <h2 className="font-display font-black text-2xl uppercase mb-2">Invite sent</h2>
            <p className="font-body text-lg mb-6">Waiting for them to say yes…</p>
            <button
              onClick={() => {
                if (inviteId) cancel({ inviteId, playerId }).catch(() => {});
                onLeave();
              }}
              className={`${btn} px-6 py-3 bg-white text-brand-black`}
            >
              CANCEL
            </button>
          </>
        )}
      </div>
    );
  }

  const onSquare = (sq: Square) => {
    if (!myTurn || promo) return;
    const legal = selected ? chess.moves({ square: selected, verbose: true }) : [];
    const target = legal.filter(m => m.to === sq);
    if (selected && target.length > 0) {
      if (target.some(m => m.promotion)) setPromo({ from: selected, to: sq });
      else send(selected, sq);
      return;
    }
    const piece = chess.get(sq);
    setSelected(piece && piece.color === you ? sq : null);
  };

  const send = async (from: Square, to: Square, promotion?: PieceSymbol) => {
    setError(null);
    setSelected(null);
    setPromo(null);
    try {
      await move({ code, playerId, from, to, promotion });
    } catch (e) {
      const m = (e instanceof Error ? e.message : '').match(/Uncaught Error: (.+?)(?:\n|$)/);
      setError(m ? m[1] : 'That move did not go through.');
    }
  };

  const legal: Move[] = selected && myTurn ? chess.moves({ square: selected, verbose: true }) : [];
  const result = game.result;
  const iWon = result && result.winner === you;
  const status = result
    ? result.winner === 'draw' ? 'DRAW' : iWon ? 'YOU WIN!' : `${opp?.name ?? 'THEY'} WIN`
    : myTurn ? 'YOUR MOVE' : `${opp?.name ?? 'THEIR'} IS THINKING…`;

  return (
    <>
      <div className="mb-2">
        <PlayerStrip color={top} label={who(top)} active={game.status === 'playing' && turn === top} captured={captured[top]} />
      </div>

      <ChessBoard
        chess={chess}
        flipped={flipped}
        selected={selected}
        legal={legal}
        lastMove={game.lastMove}
        onSquare={onSquare}
        promo={promo}
        onPromote={t => promo && send(promo.from, promo.to, t)}
      />

      <div className="mt-2">
        <PlayerStrip color={bottom} label={who(bottom)} active={game.status === 'playing' && turn === bottom} captured={captured[bottom]} />
      </div>

      <div
        aria-live="polite"
        className={`mt-4 p-3 poster-border text-center font-display font-black uppercase ${
          myTurn && chess.inCheck() ? 'bg-brand-coral' : myTurn ? 'bg-brand-acid' : 'bg-white'
        }`}
      >
        {status}
        {game.status === 'playing' && chess.inCheck() && (
          <div className="text-sm">🔥 {turn === you ? 'YOUR' : 'THEIR'} CAMPFIRE IN DANGER!</div>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-3 p-3 poster-border bg-brand-coral font-display font-bold text-sm text-center">
          {error}
        </div>
      )}

      {game.status === 'playing' && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button onClick={() => setFlipOverride(f => !f)} className={`${btn} py-3 bg-white text-sm`}>⇅ FLIP</button>
          <button
            onClick={() => {
              if (!confirmResign) { setConfirmResign(true); return; }
              setConfirmResign(false);
              resign({ code, playerId }).catch(() => {});
            }}
            onBlur={() => setConfirmResign(false)}
            className={`${btn} py-3 text-sm ${confirmResign ? 'bg-brand-coral' : 'bg-white'}`}
          >
            {confirmResign ? 'TAP AGAIN TO RESIGN' : '🏳 RESIGN'}
          </button>
        </div>
      )}

      {game.status === 'finished' && result && (
        <div
          className={`mt-6 p-8 poster-border poster-shadow text-center ${
            result.winner === 'draw' ? 'bg-brand-cyan' : iWon ? 'bg-brand-acid' : 'bg-brand-coral'
          }`}
        >
          <div className="text-6xl mb-3">{result.winner === 'draw' ? '🤝' : iWon ? '🏆' : '🌑'}</div>
          <h2 className="font-display font-black text-3xl uppercase italic mb-2">{status}</h2>
          <p className="font-body text-lg mb-2">{result.reason}</p>
          {(iWon || result.winner === 'draw') && (
            <p className="font-display font-black text-xl">+{result.winner === 'draw' ? DRAW_POINTS : ONLINE_WIN_POINTS} PTS</p>
          )}
          <p className="font-body text-sm opacity-70 mt-1">{SIDES[you].name} · {player.name}</p>
          <div className="flex gap-3 mt-4">
            <button onClick={onLeave} className={`${btn} flex-1 py-3 bg-brand-cream text-brand-black`}>LOBBY</button>
            <button
              onClick={() => rematch({ code, playerId }).catch(() => {})}
              className={`${btn} flex-1 py-3 bg-brand-black text-brand-cream`}
            >
              REMATCH →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
