'use client';

import { Fragment, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { getPlayer, updatePlayer } from '@/lib/player';
import { camperId } from '@/lib/camper';
import { CAMP_ROOM, enterCampRoom } from '@/lib/account';
import { ShuffleButton } from '@/components/arcade/Shuffle';

const btn = 'min-h-11 font-display font-black uppercase poster-border';

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
  const joinCamp = useMutation(api.rooms.joinCamp);

  // No saved camper in this room → send them to join. The camp room is for camp accounts, so log in instead.
  useEffect(() => {
    if (code === CAMP_ROOM) {
      if (!playerId) return;
      joinCamp({ playerId })
        .then(r => enterCampRoom(r.name, true))
        .catch(() => router.replace('/account?mode=login'));
      return;
    }
    const t = window.setTimeout(() => {
      const p = getPlayer();
      if (!p || p.roomCode !== code) router.push(`/join?code=${code}`);
    }, 0);
    return () => window.clearTimeout(t);
  }, [code, router, playerId, joinCamp]);

  const doLeave = async () => {
    if (!playerId) return;
    try {
      await leave({ code, playerId });
    } catch { /* room may already be gone */ }
    updatePlayer({ roomCode: '' });
    router.push(code === CAMP_ROOM ? '/games' : '/join');
  };

  // A dead room: forget the saved code and go straight back to Join, no dead-end screen
  const dead = room === null || (room !== undefined && (room.status !== 'open' || (room.camp && room.me?.kicked)));
  useEffect(() => {
    if (!dead) return;
    if (getPlayer()?.roomCode?.toUpperCase() === code.toUpperCase()) updatePlayer({ roomCode: '' });
    router.replace('/join');
  }, [dead, code, router]);

  if (room === undefined) {
    return (
      <main className="min-h-screen bg-brand-cream text-brand-black p-6 flex items-center justify-center">
        <p className="font-display font-bold uppercase">Loading your room…</p>
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
            Join another room →
          </button>
        </div>
      </main>
    );
  }

  const isHost = room.me?.isHost ?? false;
  const online = room.players.filter(p => p.online);
  const onlineCount = online.length;

  return (
    <main className="min-h-screen bg-brand-cream text-brand-black p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header card */}
        <div className="p-6 poster-border poster-shadow bg-brand-black text-brand-cream mb-6">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="font-display font-black text-3xl md:text-4xl uppercase italic">{room.name}</h1>
              <div className="font-display font-bold text-sm uppercase tracking-widest text-brand-acid mt-1">
                {room.camp ? 'Every registered camper is here' : `ROOM CODE: ${room.code}`}
              </div>
            </div>
            <div className="text-right">
              <div className="font-display font-bold text-xs uppercase tracking-widest opacity-50">{room.camp ? 'ONLINE / CAMPERS' : 'PLAYERS HERE'}</div>
              <div className="font-display font-black text-4xl text-brand-acid">{onlineCount}/{room.players.length}</div>
            </div>
          </div>
        </div>

        {room.camp && (
          <div className="admin-rise p-4 poster-border poster-shadow bg-white mb-6">
            <div className="flex items-center gap-2 font-display font-black uppercase mb-3">
              <span className="admin-live w-2.5 h-2.5 rounded-full bg-brand-acid" aria-hidden="true" />
              Online now ({onlineCount})
            </div>
            {onlineCount === 0 ? <p className="font-body text-sm">Nobody else is on right now. Pick a game and they&apos;ll see you when they come in.</p> : (
              <ul className="flex gap-3 overflow-x-auto pb-1">
                {online.map((p, i) => (
                  <li key={p.id} className="admin-rise shrink-0 w-16 text-center" style={{ animationDelay: `${i * 40}ms` }}>
                    <span className="relative inline-grid place-items-center w-14 h-14 text-3xl border-4 border-brand-acid bg-brand-acid/10 rounded-full">
                      {p.avatar}
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-brand-acid border-2 border-white" aria-hidden="true" />
                    </span>
                    <span className="block font-display font-black text-[11px] uppercase truncate mt-1">{p.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {error && (
          <div role="alert" className="p-3 mb-4 poster-border bg-brand-coral font-display font-bold text-sm uppercase">
            {error}
          </div>
        )}

        {playerId && <ShuffleButton code={code} playerId={playerId} game="ludo" label="Ludo" />}

        {/* Host's picked game */}
        {!room.round && (room.currentGame ? (
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
            className={`${btn} w-full py-4 mb-6 bg-brand-purple text-brand-cream text-xl poster-shadow`}
          >
            🎮 Pick a game →
          </button>
        ))}

        {room.round && (
          <button
            onClick={() => router.push(`/room/${code}/play`)}
            className={`${btn} w-full py-4 mb-6 bg-brand-purple text-brand-cream text-xl poster-shadow`}
          >
            ▶ Play {room.round.game}
          </button>
        )}

        {/* Roster: online campers first (room.get sorts them), then by score */}
        <div className="p-6 poster-border poster-shadow bg-white mb-6">
          <h2 className="font-display font-black text-xl uppercase mb-4">🏕️ {room.camp ? `All ${room.players.length} campers & scores` : 'Players & scores'}</h2>
          <ul className="space-y-2">
            {room.players.map((p, i) => {
              const top = Math.max(...room.players.map(x => x.total));
              const leader = p.total > 0 && p.total === top;
              const firstAway = !p.online && (i === 0 || room.players[i - 1].online);
              return (
                <Fragment key={p.id}>
                  {i === 0 && p.online && <li className="flex items-center gap-2 font-display font-black uppercase text-xs tracking-widest"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Online now ({onlineCount})</li>}
                  {firstAway && <li className="pt-2 font-display font-black uppercase text-xs tracking-widest text-brand-black/50">Away</li>}
                  <li className={`admin-slide flex items-center gap-3 p-3 border-4 ${leader ? 'border-brand-acid bg-brand-acid/10' : 'border-brand-black/10'}`}>
                    <span
                      className={`w-3 h-3 rounded-full shrink-0 ${p.online ? 'bg-green-500' : 'bg-brand-black/20'}`}
                      title={p.online ? 'Online' : 'Away'}
                    />
                    <span className="text-3xl">{p.avatar}</span>
                    <span className="font-display font-black uppercase truncate flex-1">
                      {p.name}
                      {p.isHost && (
                        <span className="ml-2 px-2 py-0.5 bg-brand-purple text-brand-cream text-xs align-middle">HOST</span>
                      )}
                    </span>
                    <span className="font-display font-black text-2xl text-brand-purple">{leader ? '👑 ' : ''}{p.total}</span>
                  </li>
                </Fragment>
              );
            })}
          </ul>
        </div>

        <div className="grid gap-3">
          {room.camp && (
            <button onClick={() => router.push('/movies')} className={`${btn} w-full py-3 bg-brand-acid text-sm`}>
              🎬 Vote on movie night →
            </button>
          )}
          <button onClick={() => router.push('/connect')} className={`${btn} w-full py-3 bg-white text-sm`}>
            🏕 Meet campers →
          </button>
          {isHost && (
            <button
              onClick={() => router.push(`/room/${code}/host`)}
              className={`${btn} w-full py-3 bg-white text-sm`}
            >
              📺 Manage room
            </button>
          )}
          <button
            onClick={() =>
              doLeave().catch(() => setError('Could not leave. Tap Leave room again.'))
            }
            className={`${btn} w-full py-3 bg-white text-sm`}
          >
            {room.camp ? '🚪 Leave for now' : '🚪 LEAVE ROOM'}
          </button>
        </div>
      </div>
    </main>
  );
}
