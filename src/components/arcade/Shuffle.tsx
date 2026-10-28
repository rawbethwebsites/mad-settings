'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { serverMessage } from '@/lib/account';
import { play } from '@/lib/sfx';

// Play random campers: a battle-royale queue. Losers go straight back in; winners can keep going.
const btn = 'min-h-11 font-display font-black uppercase poster-border';
const PING_MS = 4000;

// The camp room's way in: join the queue, then go to the game screen where the shuffle plays out
export function ShuffleButton({ code, playerId, game, label }: { code: string; playerId: string; game: string; label: string }) {
  const router = useRouter();
  const join = useMutation(api.shuffle.join);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="mb-6">
      <button
        disabled={busy}
        onClick={() => {
          setBusy(true);
          join({ code, playerId, game })
            .then(() => router.push(`/games/${game}`))
            .catch(e => { setError(serverMessage(e)); setBusy(false); });
        }}
        className={`${btn} admin-lift w-full py-4 bg-brand-acid text-brand-black text-xl poster-shadow disabled:opacity-60`}
      >
        {busy ? 'Shuffling…' : `🔀 Play random campers · ${label}`}
      </button>
      {error && <p role="alert" className="mt-2 font-display font-bold text-sm uppercase text-brand-coral">{error}</p>}
    </div>
  );
}

// Lives on a game screen: the join button, the queue, and the hand-off into each new game
export default function ShuffleBar({
  game,
  code,
  playerId,
  matchId,
  playing,
  onMatch,
}: {
  game: string;
  code: string;
  playerId: string;
  matchId: Id<'matches'> | null;
  /** A game is on screen right now: keep out of the way */
  playing: boolean;
  onMatch: (id: Id<'matches'>) => void;
}) {
  const me = useQuery(api.shuffle.status, { playerId });
  const join = useMutation(api.shuffle.join);
  const leave = useMutation(api.shuffle.leave);
  const ping = useMutation(api.shuffle.ping);
  const [error, setError] = useState('');
  const here = !!me && me.game === game;

  // Still here: keeps my place and deals games when enough campers are waiting
  useEffect(() => {
    if (!here) return;
    const beat = () => { ping({ playerId }).catch(() => {}); };
    beat();
    const t = window.setInterval(beat, PING_MS);
    return () => window.clearInterval(t);
  }, [here, playerId, ping]);

  // Matched: drop straight into the new game
  const next = here && me.status === 'matched' && me.matchLive && me.matchId !== matchId ? me.matchId : null;
  useEffect(() => {
    if (!next) return;
    play('invite');
    onMatch(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next]);

  const go = () => {
    setError('');
    join({ code, playerId, game }).catch(e => setError(serverMessage(e)));
  };
  const stop = () => { leave({ playerId }).catch(() => {}); };

  if (me === undefined) return null;
  const err = error && <p role="alert" className="mt-2 font-display font-bold text-sm uppercase text-brand-coral">{error}</p>;

  if (!here) {
    if (playing) return null;
    return (
      <div className="mb-4">
        <button onClick={go} className={`${btn} admin-lift w-full py-3 bg-brand-acid text-brand-black poster-shadow`}>
          🔀 Play random campers
        </button>
        {err}
      </div>
    );
  }

  if (me.status === 'matched') {
    if (!me.matchLive) return null;
    return (
      <p className="admin-slide mb-2 px-3 py-1.5 poster-border bg-brand-acid font-display font-black text-xs uppercase truncate">
        🔀 Round {me.round} · matched with {me.opponents.map(o => `${o.avatar} ${o.name}`).join(', ')}
      </p>
    );
  }

  if (me.status === 'won') {
    return (
      <div className="admin-rise mb-4 p-4 poster-border poster-shadow bg-brand-acid text-brand-black">
        <p className="font-display font-black uppercase text-lg">🏆 You won round {me.round}!</p>
        <p className="font-body text-sm mb-3">{me.wins} win{me.wins === 1 ? '' : 's'} so far. Keep going against fresh campers?</p>
        <div className="flex gap-2">
          <button onClick={go} className={`${btn} flex-1 py-2 bg-brand-black text-brand-cream`}>▶ Keep going</button>
          <button onClick={stop} className={`${btn} px-4 py-2 bg-white`}>Stop</button>
        </div>
        {err}
      </div>
    );
  }

  // Waiting in the queue
  return (
    <div className="admin-rise mb-4 p-4 poster-border poster-shadow bg-brand-black text-brand-cream" role="status">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-display font-black uppercase">
          <span className="admin-live w-2.5 h-2.5 rounded-full bg-brand-acid" aria-hidden="true" />
          {me.round > 0 ? `Next round · round ${me.round + 1}` : 'In the shuffle'}
        </p>
        <button onClick={stop} className="min-h-11 px-2 font-display font-bold text-xs uppercase hover:text-brand-acid">✕ Leave</button>
      </div>
      <p className="font-body text-sm opacity-80 mb-3">
        {me.waiting.length === 0
          ? 'Looking for campers online… you can play the computer while you wait.'
          : `Matching you with ${me.waiting.length} camper${me.waiting.length === 1 ? '' : 's'} in the queue…`}
      </p>
      {me.waiting.length > 0 && (
        <ul className="flex gap-3 overflow-x-auto pb-1">
          {me.waiting.map((p, i) => (
            <li key={i} className="admin-rise shrink-0 w-14 text-center" style={{ animationDelay: `${i * 40}ms` }}>
              <span className="inline-grid place-items-center w-12 h-12 text-2xl border-4 border-brand-acid rounded-full">{p.avatar}</span>
              <span className="block font-display font-black text-[10px] uppercase truncate mt-1">{p.name}</span>
            </li>
          ))}
        </ul>
      )}
      {me.round > 0 && me.opponents.length > 0 && (
        <p className="font-display font-bold text-xs uppercase opacity-60 mt-2">
          Last round: vs {me.opponents.map(o => `${o.avatar} ${o.name}`).join(', ')}
        </p>
      )}
      {err}
    </div>
  );
}
