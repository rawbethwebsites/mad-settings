'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { Bot, Users } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { addScore, getPlayer, type Player } from '@/lib/player';
import { camperId } from '@/lib/camper';
import { RULES } from '@/lib/rules';
import type { OnlineProps } from '@/lib/rules/types';
import { useResultSound, useTurnSound } from '@/lib/useGameSounds';
import { Btn } from './ui';
import SoundToggle, { buttonTap } from './SoundControls';
import TurnCountdown from './TurnCountdown';

export interface ShellApi {
  player: Player;
  /** Adds points to this game's slot on the camper's scorecard */
  award: (points: number) => void;
}

const btn = 'min-h-11 font-display font-black uppercase poster-border';

export default function GameShell({
  id,
  title,
  emoji,
  online,
  children,
}: {
  id: string;
  title: string;
  emoji: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  online?: { render: (p: OnlineProps<any, any>) => ReactNode };
  children: (api: ShellApi) => ReactNode;
}) {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [tab, setTab] = useState<'computer' | 'campers'>('computer');
  const [matchId, setMatchId] = useState<Id<'matches'> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const p = getPlayer();
    if (!p) { router.push('/join'); return; }
    const t = window.setTimeout(() => {
      setPlayer(p);
      setPlayerId(camperId());
      // A link from an invite toast lands here with ?match=<id>
      const m = new URLSearchParams(window.location.search).get('match');
      if (m) {
        setMatchId(m as Id<'matches'>);
        setTab('campers');
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [router]);

  const inRoom = !!player?.roomCode && !!playerId;
  const room = useQuery(
    api.rooms.get,
    inRoom ? { code: player!.roomCode, playerId: playerId! } : 'skip',
  );
  // Coming back mid-match? Pick it up again.
  const mine = useQuery(
    api.matches.mine,
    inRoom ? { code: player!.roomCode, playerId: playerId!, game: id } : 'skip',
  );
  const match = useQuery(
    api.matches.get,
    matchId && playerId ? { matchId, playerId } : 'skip',
  );
  useEffect(() => {
    if (!matchId && mine) {
      const t = window.setTimeout(() => {
        setMatchId(mine);
        setTab('campers');
      }, 0);
      return () => window.clearTimeout(t);
    }
  }, [mine, matchId]);

  if (!player || !playerId) return null;

  const award = (points: number) => {
    if (points > 0) addScore(id, points);
  };

  const myRoomPlayer = room?.players.find(p => p.id === room.me?.id);
  const showOnline = !!online && inRoom && !!room;
  const playingOnline = showOnline && tab === 'campers' && match?.status === 'playing';
  const clearMatch = () => {
    setMatchId(null);
    window.history.replaceState(null, '', window.location.pathname);
  };

  return (
    <main onClick={buttonTap} className={`min-h-screen bg-brand-cream text-brand-black ${playingOnline ? 'p-3 md:p-6' : 'p-4 md:p-6'}`}>
      <div className="max-w-xl mx-auto">
        <div className={`flex justify-between items-center gap-2 ${playingOnline ? 'mb-2' : 'mb-4'}`}>
          {!playingOnline && (
            <button onClick={() => router.push('/games')} className="min-h-11 min-w-11 shrink-0 whitespace-nowrap font-display font-bold text-sm uppercase hover:text-brand-purple">
              ← BACK
            </button>
          )}
          <h1 className={`font-display font-black sm:text-2xl md:text-3xl uppercase italic min-w-0 ${playingOnline ? 'text-lg truncate' : 'text-xl'}`}>
            {emoji} {title}
          </h1>
          <div className="flex items-center gap-2 shrink-0 [&_button]:min-h-11 [&_button]:min-w-11">
            <span className="font-display font-black text-xl hidden sm:inline">{player.avatar}</span>
            <SoundToggle />
          </div>
        </div>

        {/* Room bar: where your points are going */}
        {playingOnline && room ? (
          <div data-online-room-bar className="flex items-center justify-between gap-2 mb-2 font-display font-bold text-xs uppercase">
            <button onClick={() => router.push(`/room/${room.code}`)} className="min-h-11 min-w-0 truncate hover:text-brand-purple">
              ROOM {room.code} · {room.players.filter(p => p.online).length} ONLINE
            </button>
            <button onClick={() => router.push('/games')} className="min-h-11 min-w-11 shrink-0 hover:text-brand-purple">← Back</button>
          </div>
        ) : inRoom && room && (
          <button
            onClick={() => router.push(`/room/${room.code}`)}
            className="w-full mb-4 p-3 poster-border bg-brand-black text-brand-cream flex items-center justify-between gap-2"
          >
            <span className="font-display font-bold text-xs uppercase tracking-widest">
              ROOM {room.code} · {room.players.filter(p => p.online).length} ONLINE
            </span>
            <span className="font-display font-black text-brand-acid">
              {myRoomPlayer?.total ?? 0} PTS →
            </span>
          </button>
        )}

        {error && (
          <div role="alert" className="p-3 mb-4 poster-border bg-brand-coral font-display font-bold text-sm uppercase">
            {error}
            <button onClick={() => setError('')} className="min-h-11 px-2 flex items-center gap-1">✕ Dismiss</button>
          </div>
        )}

        {online && !playingOnline && (
          <div className="flex gap-2 mb-4" role="tablist">
            {(['computer', 'campers'] as const).map(t => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => { setTab(t); setError(''); }}
                className={`${btn} flex-1 flex items-center justify-center gap-2 px-2 py-3 text-sm normal-case ${tab === t ? 'bg-brand-black text-brand-cream' : 'bg-white'}`}
              >
                {t === 'computer' ? <Bot aria-hidden="true" size={20} className="shrink-0" /> : <Users aria-hidden="true" size={20} className="shrink-0" />}
                {t === 'computer' ? 'Play the computer' : 'Play a friend'}
              </button>
            ))}
          </div>
        )}

        {online && tab === 'campers' && !showOnline ? (
          <Arena>
            {inRoom && room === undefined ? <p role="status">Loading your room…</p> : (
              <>
                <p className="font-body mb-4">Join your friend&apos;s room to play together.</p>
                <button onClick={() => router.push('/join')} className={`${btn} w-full py-4 bg-brand-purple text-brand-cream`}>→ Join a room</button>
              </>
            )}
          </Arena>
        ) : showOnline && tab === 'campers' ? (
          <OnlineArena
            gameId={id}
            code={player.roomCode}
            playerId={playerId}
            matchId={matchId}
            match={match}
            setMatchId={setMatchId}
            clearMatch={clearMatch}
            render={online!.render}
            onError={setError}
          />
        ) : (
          children({ player, award })
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Play campers: lobby → waiting room → live game → result

function Arena({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="p-5 poster-border poster-shadow bg-white">{children}</div>;
}

function OnlineArena({
  gameId,
  code,
  playerId,
  matchId,
  match,
  setMatchId,
  clearMatch,
  render,
  onError,
}: {
  gameId: string;
  code: string;
  playerId: string;
  matchId: Id<'matches'> | null;
  match: MatchData | null | undefined;
  setMatchId: (id: Id<'matches'>) => void;
  clearMatch: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (p: OnlineProps<any, any>) => ReactNode;
  onError: (msg: string) => void;
}) {
  const rules = RULES[gameId];
  const room = useQuery(api.rooms.get, { code, playerId });

  const create = useMutation(api.matches.create);

  const [picked, setPicked] = useState<Id<'roomPlayers'>[]>([]);
  const [busy, setBusy] = useState(false);

  // A cancelled invite clears the screen back to the picker
  useEffect(() => {
    if (match && (match.status === 'cancelled' || match.seat === null)) clearMatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.status, match?.seat]);

  if (!rules) return <p className="font-body text-center p-4">This game can&apos;t be played online.</p>;

  // Lobby: pick who to invite
  if (!matchId || !match) {
    // Everyone in the room can be invited; the invite waits for them on any page
    const others = (room?.players ?? [])
      .filter(p => p.id !== room?.me?.id)
      .sort((a, b) => Number(b.online) - Number(a.online));
    const maxPick = rules.max - 1;
    const minNeeded = rules.min - 1;
    const toggle = (pid: Id<'roomPlayers'>) => {
      setPicked(s =>
        s.includes(pid) ? s.filter(x => x !== pid) : s.length < maxPick ? [...s, pid] : s,
      );
    };
    return (
      <Arena>
        <h2 className="font-display font-black text-xl uppercase mb-1">Pick a friend</h2>
        {others.length > 0 && <p className="font-body text-sm text-brand-black/60 mb-4">
          {rules.min === rules.max
            ? `Pick ${minNeeded}, then tap Invite.`
            : `Pick ${minNeeded}–${maxPick}, then tap Invite.`}
        </p>}
        {others.length === 0 ? (
          <p className="font-body text-lg text-brand-black/70">
            Share room code <b>{code}</b> with a friend.
          </p>
        ) : (
          <ul className="space-y-2 mb-4">
            {others.map(p => {
              const on = picked.includes(p.id);
              return (
                <li key={p.id}>
                  <button
                    onClick={() => toggle(p.id)}
                    aria-pressed={on}
                    className={`w-full flex items-center gap-3 p-3 border-4 transition-colors ${
                      on ? 'border-brand-purple bg-brand-purple/10' : 'border-brand-black/15 bg-white'
                    }`}
                  >
                    <span className="text-3xl">{p.avatar}</span>
                    <span className="font-display font-black uppercase flex-1 text-left truncate">
                      {p.name}
                      {!p.online && <span className="ml-2 font-body font-normal normal-case text-xs text-brand-black/50">away</span>}
                    </span>
                    <span className={`w-6 h-6 border-4 border-brand-black flex items-center justify-center font-display font-black ${on ? 'bg-brand-acid' : 'bg-white'}`}>
                      {on ? '✓' : ''}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <Btn
          variant="primary"
          className="w-full min-h-12"
          disabled={picked.length < minNeeded || busy}
          onClick={() => {
            setBusy(true);
            create({ code, playerId, game: gameId, invite: picked })
              .then(id => setMatchId(id as Id<'matches'>))
              .catch(() => onError('Could not invite. Tap Invite again.'))
              .finally(() => setBusy(false));
          }}
        >
          {busy ? 'Inviting…' : '→ Invite'}
        </Btn>
      </Arena>
    );
  }

  // Waiting room: who's in, who we're waiting for
  if (match.status === 'waiting') {
    return <WaitingRoom match={match} playerId={playerId} clearMatch={clearMatch} />;
  }

  // Playing / finished
  return (
    <LiveMatch match={match} playerId={playerId} render={render} clearMatch={clearMatch} onError={onError} />
  );
}

interface MatchData {
  id: Id<'matches'>;
  game: string;
  status: 'waiting' | 'playing' | 'finished' | 'cancelled';
  round: number;
  seat: number | null;
  isCreator: boolean;
  min: number;
  seats: { name: string; avatar: string; online: boolean }[];
  waitingFor: string[];
  turn: number | null;
  turnDeadline: number | null;
  serverNow: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  view: any;
  result: { winners: number[]; reason: string } | null;
  points: { win: number; draw: number };
}

function WaitingRoom({
  match,
  playerId,
  clearMatch,
}: {
  match: MatchData;
  playerId: string;
  clearMatch: () => void;
}) {
  const cancel = useMutation(api.matches.cancel);
  const begin = useMutation(api.matches.begin);
  const [error, setError] = useState('');
  const canDeal = match.isCreator && match.seats.length >= match.min;

  return (
    <Arena>
      <div className="text-center">
        <div className="text-5xl mb-3 animate-pulse">⏳</div>
        <h2 className="font-display font-black text-2xl uppercase mb-4">GAME ROUND {match.round}</h2>

        <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50 mb-2">IN THE GAME</div>
        <ul className="space-y-2 mb-4">
          {match.seats.map((s, i) => (
            <li key={i} className="flex items-center gap-3 p-3 border-4 border-brand-black/10">
              <span className={`w-3 h-3 rounded-full ${s.online ? 'bg-brand-acid' : 'bg-brand-black/20'}`} />
              <span className="text-2xl">{s.avatar}</span>
              <span className="font-display font-black uppercase">{s.name}</span>
            </li>
          ))}
        </ul>

        {match.waitingFor.length > 0 && (
          <p className="font-body text-brand-black/60 mb-4">
            Waiting for <b>{match.waitingFor.join(', ')}</b> to join…
          </p>
        )}

        {error && (
          <div role="alert" className="p-3 mb-3 border-2 border-brand-coral font-display font-bold text-sm uppercase text-brand-coral">
            {error}
          </div>
        )}

        <div className="grid gap-2">
          {match.isCreator && (
            <Btn
              variant="primary"
              disabled={!canDeal}
              className="min-h-12"
              onClick={() => begin({ matchId: match.id, playerId }).catch(() => setError('Could not start. Tap Start game again.'))}
            >
              {canDeal ? '▶ Start game' : `Waiting for ${match.min - match.seats.length} more`}
            </Btn>
          )}
          {match.isCreator ? (
            <Btn
              variant="light"
              onClick={() =>
                cancel({ matchId: match.id, playerId }).catch(() => {}).finally(clearMatch)
              }
            >
              ✕ Cancel game
            </Btn>
          ) : (
            <Btn variant="light" onClick={clearMatch}>
              ← Back
            </Btn>
          )}
        </div>
      </div>
    </Arena>
  );
}

function LiveMatch({
  match,
  playerId,
  render,
  clearMatch,
  onError,
}: {
  match: MatchData;
  playerId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (p: OnlineProps<any, any>) => ReactNode;
  clearMatch: () => void;
  onError: (msg: string) => void;
}) {
  const act = useMutation(api.matches.act);
  const resign = useMutation(api.matches.resign);
  const rematch = useMutation(api.matches.rematch);
  const [confirmResign, setConfirmResign] = useState(false);

  const names = match.seats.map(s => s.name);
  const finished = match.status === 'finished';
  const winners = match.result?.winners ?? [];
  const draw = finished && winners.length === 0;
  const iWon = finished && match.seat !== null && winners.includes(match.seat);
  const roundKey = `${match.id}:${match.round}`;
  useTurnSound(!finished && match.seat !== null && match.turn === match.seat, roundKey);
  useResultSound(finished && match.seat !== null ? (draw ? 'draw' : iWon ? 'win' : 'lose') : null, roundKey);

  // Points were awarded on the server by matches.act — no local award here
  const myPoints = finished ? (draw ? match.points.draw : iWon ? match.points.win : 0) : 0;

  const send = async (a: unknown) => {
    await act({ matchId: match.id, playerId, action: a });
  };

  return (
    <div>
      {/* Player strips */}
      <div className="grid grid-cols-2 gap-2 mb-2" aria-label="Players">
        {match.seats.map((s, i) => (
          <div
            key={i}
            data-player-strip={i}
            data-active={match.turn === i && !finished}
            className={`flex min-w-0 items-center gap-1.5 px-2 py-1 min-h-12 poster-border ${
              match.turn === i ? 'bg-brand-acid' : 'bg-white'
            }`}
          >
            <span aria-label={s.online ? 'Online' : 'Away'} className={`w-2 h-2 shrink-0 rounded-full ${s.online ? 'bg-green-500' : 'bg-brand-black/20'}`} />
            <span className="text-lg shrink-0" aria-hidden="true">{s.avatar}</span>
            <div className="min-w-0 flex-1 font-display uppercase">
              <div title={s.name} className="font-black text-xs truncate">{s.name}</div>
              <div className="font-bold text-[10px] text-brand-black/60">
                {match.seat === i ? 'YOU' : 'FRIEND'}{match.turn === i && !finished && ' · TURN'}
              </div>
            </div>
            {match.turn === i && !finished && match.turnDeadline !== null && (
              <div className="shrink-0 [&_[role=timer]]:m-0 [&_[role=timer]]:border-0 [&_[role=timer]]:p-0 [&_[role=timer]>p]:sr-only [&_[aria-hidden=true]]:size-8">
                <TurnCountdown
                  key={`${roundKey}:${match.turnDeadline}`}
                  deadline={match.turnDeadline}
                  serverNow={match.serverNow}
                  duration={RULES[match.game]?.turnSeconds ?? 30}
                  label={match.turn === match.seat ? 'Your move' : `${names[match.turn]}'s move`}
                  round={`${roundKey}:${match.turnDeadline}`}
                  seat={match.turn}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* The game itself */}
      {match.status === 'playing' && match.view !== null && (
        render({
          view: match.view,
          seat: match.seat,
          names,
          act: async (a: unknown) => {
            try {
              await send(a);
            } catch (e) {
              throw new Error('Move not saved. Tap your move again.', { cause: e });
            }
          },
        })
      )}

      {match.status === 'playing' && match.seat !== null && (
        <button
          onClick={() => {
            if (!confirmResign) { setConfirmResign(true); return; }
            setConfirmResign(false);
            resign({ matchId: match.id, playerId }).catch(() => onError('Could not leave. Tap Give up again.'));
          }}
          onBlur={() => setConfirmResign(false)}
          className={`${btn} w-full mt-4 py-2 text-xs ${confirmResign ? 'bg-brand-coral' : 'bg-white'}`}
        >
          {confirmResign ? 'Give up? Tap again' : '🏳 Give up'}
        </button>
      )}

      {finished && match.result && (
        <div
          className={`mt-6 p-8 poster-border poster-shadow text-center ${
            draw ? 'bg-brand-cyan' : iWon ? 'bg-brand-acid' : 'bg-brand-coral'
          }`}
        >
          <div className="text-6xl mb-3">{draw ? '🤝' : iWon ? '🏆' : '🌑'}</div>
          <h2 className="font-display font-black text-3xl uppercase italic mb-2">
            {draw ? 'DRAW' : iWon ? 'YOU WIN!' : `${winners.map(w => names[w]).join(' & ')} WIN${winners.length > 1 ? '' : 'S'}`}
          </h2>
          {/ran out of time/i.test(match.result.reason) && <p className="font-display font-black uppercase mb-2">Ran out of time</p>}
          <p className="font-body text-lg mb-2">{match.result.reason}</p>
          {myPoints > 0 && <p className="font-display font-black text-xl">+{myPoints} PTS ON THE BOARD</p>}
          <div className="flex gap-3 mt-4">
            <button onClick={clearMatch} className={`${btn} flex-1 py-3 bg-brand-cream`}>
              ← Back
            </button>
            {match.seat !== null && (
              <button
                onClick={() => rematch({ matchId: match.id, playerId }).catch(() => onError('Could not restart. Tap Play again.'))}
                className={`${btn} flex-1 py-3 bg-brand-black text-brand-cream`}
              >
                ▶ Play again
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
