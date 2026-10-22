'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { toDataURL } from 'qrcode';
import { api } from '../../../../../convex/_generated/api';
import { camperId, stripServerError } from '@/lib/camper';
import { BingoHost, RoundStartButtons, TriviaHost } from '@/components/room/rounds';

const btn = 'font-display font-black uppercase poster-border';

// Same list campers see on /games — the host picks what everyone plays now
const GAMES = [
  { id: 'bingo', name: 'SMART BINGO', emoji: '🎯' },
  { id: 'search', name: 'ULTIMATE SEARCH', emoji: '🔍' },
  { id: 'puzzles', name: 'PUZZLE RUSH', emoji: '🧩' },
  { id: 'vault', name: 'THE VAULT', emoji: '🔐' },
  { id: 'same', name: "DON'T SAY IT", emoji: '🤐' },
  { id: 'chess', name: 'CAMP CHESS', emoji: '♟️' },
  { id: 'ayo', name: 'AYO', emoji: '🌰' },
  { id: 'whot', name: 'WHOT!', emoji: '🃏' },
  { id: 'ocho', name: 'OCHO!', emoji: '🎴' },
  { id: 'tenten', name: 'TEN TEN', emoji: '👆' },
  { id: 'trivia', name: 'NAIJA TRIVIA', emoji: '🇳🇬' },
  { id: 'chopchop', name: 'CHOP CHOP', emoji: '🍢' },
  { id: 'minesweeper', name: 'MINESWEEPER', emoji: '💣' },
  { id: 'connect4', name: 'CONNECT 4', emoji: '🔴' },
  { id: 'tictactoe', name: 'ENDLESS TIC TAC TOE', emoji: '⭕' },
  { id: 'dots', name: 'DOTS & BOXES', emoji: '🔲' },
];

export default function HostPage() {
  const router = useRouter();
  const { code: raw } = useParams<{ code: string }>();
  const code = (raw ?? '').toUpperCase();

  const [playerId] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : camperId(),
  );
  const [qr, setQr] = useState('');
  const [error, setError] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);

  const room = useQuery(api.rooms.get, playerId ? { code, playerId } : 'skip');
  const kick = useMutation(api.rooms.kick);
  const setGame = useMutation(api.rooms.setGame);
  const close = useMutation(api.rooms.close);

  const joinUrl = `https://madsettings.theboostnation.space/join?code=${code}`;
  useEffect(() => {
    toDataURL(joinUrl, { margin: 1, width: 512, color: { dark: '#0A0A0A', light: '#FDFBF7' } })
      .then(setQr)
      .catch(() => {});
  }, [joinUrl]);

  if (room === undefined) {
    return (
      <main className="min-h-screen bg-brand-black text-brand-cream p-6 flex items-center justify-center">
        <p className="font-display font-bold uppercase">Setting up the big screen…</p>
      </main>
    );
  }

  if (room === null || room.status !== 'open') {
    return (
      <main className="min-h-screen bg-brand-black text-brand-cream p-6 flex items-center justify-center">
        <div className="max-w-md w-full p-8 poster-border poster-shadow bg-brand-cream text-brand-black text-center">
          <div className="text-5xl mb-3">⛺</div>
          <h1 className="font-display font-black text-2xl uppercase mb-4">That room is gone</h1>
          <button onClick={() => router.push('/join')} className={`${btn} px-6 py-3 bg-brand-purple text-brand-cream w-full`}>
            JOIN ANOTHER →
          </button>
        </div>
      </main>
    );
  }

  if (!room.me?.isHost) {
    return (
      <main className="min-h-screen bg-brand-black text-brand-cream p-6 flex items-center justify-center">
        <div className="max-w-md w-full p-8 poster-border poster-shadow bg-brand-cream text-brand-black text-center">
          <div className="text-5xl mb-3">📺</div>
          <h1 className="font-display font-black text-2xl uppercase mb-2">Only the host runs this screen</h1>
          <p className="font-body text-brand-black/60 mb-6">Grab the room code from whoever started the room.</p>
          <button onClick={() => router.push(`/room/${code}`)} className={`${btn} px-6 py-3 bg-brand-black text-brand-cream w-full`}>
            ← BACK TO ROOM
          </button>
        </div>
      </main>
    );
  }

  const run = (fn: () => Promise<unknown>) => {
    setError('');
    fn().catch(e => setError(stripServerError(e)));
  };

  return (
    <main className="min-h-screen bg-brand-black text-brand-cream p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Big code + QR */}
        <div className="grid md:grid-cols-[1fr_auto] gap-6 items-center p-6 md:p-8 poster-border poster-shadow bg-brand-purple mb-8">
          <div>
            <div className="font-display font-bold text-sm uppercase tracking-widest text-brand-acid mb-1">
              {room.name} · CAMPERS JOIN WITH
            </div>
            <div className="font-display font-black text-7xl md:text-9xl tracking-widest text-brand-cream leading-none">
              {room.code}
            </div>
            <p className="font-body text-lg text-brand-cream/70 mt-3">
              Go to <b className="text-brand-acid">madsettings.theboostnation.space/join</b> or scan the code.
            </p>
          </div>
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element -- src is a runtime data: URL from the qrcode package, nothing for next/image to optimize
            <img
              src={qr}
              alt={`QR code for ${joinUrl}`}
              className="w-40 h-40 md:w-56 md:h-56 poster-border bg-brand-cream"
            />
          )}
        </div>

        {error && (
          <div role="alert" className="p-3 mb-6 poster-border bg-brand-coral text-brand-black font-display font-bold uppercase">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Roster */}
          <div className="p-6 poster-border poster-shadow bg-brand-cream text-brand-black">
            <h2 className="font-display font-black text-2xl uppercase mb-4">
              🏕️ CAMPERS · {room.players.filter(p => p.online).length}/{room.players.length} ONLINE
            </h2>
            <ul className="space-y-2">
              {room.players.map(p => (
                <li key={p.id} className="flex items-center gap-3 p-3 border-4 border-brand-black/10">
                  <span className={`w-3 h-3 rounded-full shrink-0 ${p.online ? 'bg-brand-acid' : 'bg-brand-black/20'}`} />
                  <span className="text-3xl">{p.avatar}</span>
                  <span className="font-display font-black uppercase truncate flex-1">
                    {p.name}
                    {p.isHost && <span className="ml-2 px-2 py-0.5 bg-brand-purple text-brand-cream text-xs">HOST</span>}
                  </span>
                  <span className="font-display font-black text-xl text-brand-purple">{p.total}</span>
                  {!p.isHost && (
                    <button
                      onClick={() => run(() => kick({ code, playerId: playerId!, target: p.id }))}
                      aria-label={`Remove ${p.name}`}
                      className={`${btn} px-3 py-2 bg-brand-coral text-xs shrink-0`}
                    >
                      KICK
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Pick the game + live leaderboard */}
          <div className="space-y-6">
            {/* Host-led rounds everyone plays at once */}
            <div className="p-6 poster-border poster-shadow bg-white text-brand-black">
              <h2 className="font-display font-black text-2xl uppercase mb-4">📣 GROUP ROUND</h2>
              {room.round?.game === 'trivia' && <TriviaHost roundId={room.round.id} />}
              {room.round?.game === 'bingo' && <BingoHost roundId={room.round.id} />}
              {!room.round && <RoundStartButtons code={code} />}
            </div>
            <div className="p-6 poster-border poster-shadow bg-brand-cream text-brand-black">
              <h2 className="font-display font-black text-2xl uppercase mb-4">🎮 NOW PLAYING</h2>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => run(() => setGame({ code, playerId: playerId!, game: null }))}
                  className={`${btn} py-3 text-xs col-span-2 ${!room.currentGame ? 'bg-brand-black text-brand-cream' : 'bg-white'}`}
                >
                  ✋ FREE PLAY
                </button>
                {GAMES.map(g => (
                  <button
                    key={g.id}
                    onClick={() => run(() => setGame({ code, playerId: playerId!, game: g.id }))}
                    className={`${btn} py-3 text-xs text-left ${room.currentGame === g.id ? 'bg-brand-purple text-brand-cream' : 'bg-white'}`}
                  >
                    {g.emoji} {g.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 poster-border poster-shadow bg-brand-cream text-brand-black">
              <h2 className="font-display font-black text-2xl uppercase mb-4">🏆 LEADERBOARD</h2>
              <ol className="space-y-2">
                {room.players.map((p, i) => (
                  <li key={p.id} className={`flex items-center gap-3 p-2 ${i === 0 && p.total > 0 ? 'bg-brand-acid/30 border-2 border-brand-acid' : ''}`}>
                    <span className="font-display font-black text-xl w-8">{i + 1}.</span>
                    <span className="text-2xl">{p.avatar}</span>
                    <span className="font-display font-black uppercase flex-1 truncate">{p.name}</span>
                    <span className="font-display font-black text-2xl text-brand-purple">{p.total}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => router.push(`/room/${code}`)}
            className={`${btn} px-6 py-3 bg-brand-cream text-brand-black`}
          >
            ← ROOM
          </button>
          {!confirmClose ? (
            <button onClick={() => setConfirmClose(true)} className={`${btn} px-6 py-3 bg-brand-coral text-brand-black`}>
              🛑 CLOSE ROOM
            </button>
          ) : (
            <button
              onClick={() => run(() => close({ code, playerId: playerId! }).then(() => router.push('/join')))}
              className={`${btn} px-6 py-3 bg-brand-coral text-brand-black animate-pulse`}
            >
              TAP AGAIN: EVERYONE IS OUT
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
