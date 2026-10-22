'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { getPlayer, updatePlayer } from '@/lib/player';
import { camperId, stripServerError } from '@/lib/camper';

const btn = 'font-display font-black uppercase poster-border';

export default function RoomPage() {
  const router = useRouter();
  const { code: raw } = useParams<{ code: string }>();
  const code = (raw ?? '').toUpperCase();

  const [playerId] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : camperId(),
  );
  const [error, setError] = useState('');

  const room = useQuery(
    api.rooms.get,
    playerId ? { code, playerId } : 'skip',
  );
  const leave = useMutation(api.rooms.leave);

  // No saved camper in this room → send them to join
  useEffect(() => {
    const t = window.setTimeout(() => {
      const p = getPlayer();
      if (!p || p.roomCode !== code) router.push(`/join?code=${code}`);
    }, 0);
    return () => window.clearTimeout(t);
  }, [code, router]);

  const doLeave = async () => {
    if (!playerId) return;
    try {
      await leave({ code, playerId });
    } catch { /* room may already be gone */ }
    updatePlayer({ roomCode: '' });
    router.push('/join');
  };

  // A dead room: forget the saved code and go straight back to Join, no dead-end screen
  const dead = room === null || (room !== undefined && room.status !== 'open');
  useEffect(() => {
    if (!dead) return;
    if (getPlayer()?.roomCode?.toUpperCase() === code.toUpperCase()) updatePlayer({ roomCode: '' });
    router.replace('/join');
  }, [dead, code, router]);

  if (room === undefined) {
    return (
      <main className="min-h-screen bg-brand-cream text-brand-black p-6 flex items-center justify-center">
        <p className="font-display font-bold uppercase">Knocking on the cabin door…</p>
      </main>
    );
  }

  if (room === null || room.status !== 'open') {
    return (
      <main className="min-h-screen bg-brand-cream text-brand-black p-6 flex items-center justify-center">
        <div className="max-w-md w-full p-8 poster-border poster-shadow bg-white text-center">
          <div className="text-5xl mb-3">⛺</div>
          <h1 className="font-display font-black text-2xl uppercase mb-4">That room is gone</h1>
          <button onClick={() => router.push('/join')} className={`${btn} px-6 py-3 bg-brand-purple text-brand-cream w-full`}>
            JOIN ANOTHER →
          </button>
        </div>
      </main>
    );
  }

  const isHost = room.me?.isHost ?? false;
  const onlineCount = room.players.filter(p => p.online).length;

  return (
    <main className="min-h-screen bg-brand-cream text-brand-black p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header card */}
        <div className="p-6 poster-border poster-shadow bg-brand-black text-brand-cream mb-6">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="font-display font-black text-3xl md:text-4xl uppercase italic">{room.name}</h1>
              <div className="font-display font-bold text-sm uppercase tracking-widest text-brand-acid mt-1">
                ROOM CODE: {room.code}
              </div>
            </div>
            <div className="text-right">
              <div className="font-display font-bold text-xs uppercase tracking-widest opacity-50">CAMPERS HERE</div>
              <div className="font-display font-black text-4xl text-brand-acid">{onlineCount}/{room.players.length}</div>
            </div>
          </div>
        </div>

        {error && (
          <div role="alert" className="p-3 mb-4 poster-border bg-brand-coral font-display font-bold text-sm uppercase">
            {error}
          </div>
        )}

        {/* Host's picked game */}
        {room.currentGame ? (
          <div className="p-6 poster-border poster-shadow bg-brand-purple text-brand-cream mb-6">
            <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-acid mb-1">
              THE HOST PICKED
            </div>
            <div className="font-display font-black text-3xl uppercase mb-4">{room.currentGame.toUpperCase()}</div>
            <button
              onClick={() => router.push(`/games/${room.currentGame}`)}
              className={`${btn} w-full py-4 bg-brand-acid text-brand-black text-xl`}
            >
              ▶ PLAY NOW
            </button>
          </div>
        ) : (
          <button
            onClick={() => router.push('/games')}
            className={`${btn} w-full py-4 mb-6 bg-white text-lg`}
          >
            🎮 PICK A GAME FROM ALL GAMES →
          </button>
        )}

        {room.round && (
          <button
            onClick={() => router.push(`/room/${code}/play`)}
            className={`${btn} w-full py-4 mb-6 bg-brand-coral text-xl animate-pulse`}
          >
            🔴 LIVE: {room.round.game.toUpperCase()} — TAP TO PLAY
          </button>
        )}

        {/* Roster + leaderboard (room.get returns players sorted by total) */}
        <div className="p-6 poster-border poster-shadow bg-white mb-6">
          <h2 className="font-display font-black text-xl uppercase mb-4">🏕️ CAMPERS & SCORES</h2>
          <ul className="space-y-2">
            {room.players.map((p, i) => (
              <li
                key={p.id}
                className={`flex items-center gap-3 p-3 border-4 ${i === 0 && p.total > 0 ? 'border-brand-acid bg-brand-acid/10' : 'border-brand-black/10'}`}
              >
                <span className="font-display font-black text-lg w-6 text-brand-black/40">{i + 1}</span>
                <span
                  className={`w-3 h-3 rounded-full shrink-0 ${p.online ? 'bg-brand-acid' : 'bg-brand-black/20'}`}
                  title={p.online ? 'Online' : 'Away'}
                />
                <span className="text-3xl">{p.avatar}</span>
                <span className="font-display font-black uppercase truncate flex-1">
                  {p.name}
                  {p.isHost && (
                    <span className="ml-2 px-2 py-0.5 bg-brand-purple text-brand-cream text-xs align-middle">HOST</span>
                  )}
                </span>
                <span className="font-display font-black text-2xl text-brand-purple">{p.total}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-3">
          {isHost && (
            <button
              onClick={() => router.push(`/room/${code}/host`)}
              className={`${btn} w-full py-4 bg-brand-black text-brand-cream text-xl`}
            >
              📺 HOST SCREEN
            </button>
          )}
          <button
            onClick={() =>
              doLeave().catch(e => setError(stripServerError(e)))
            }
            className={`${btn} w-full py-3 bg-white text-sm`}
          >
            🚪 LEAVE ROOM
          </button>
        </div>
      </div>
    </main>
  );
}
