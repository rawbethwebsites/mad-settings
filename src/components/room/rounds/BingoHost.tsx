'use client';

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { getChessPlayerId } from '@/lib/chessOnline';
import { Leaderboard, roundError } from './TriviaPlayer';

const btn = 'font-display font-black uppercase poster-border';

export default function BingoHost({ roundId }: { roundId: Id<'rounds'> }) {
  const [playerId] = useState(() => getChessPlayerId());
  const [error, setError] = useState<string | null>(null);

  const data = useQuery(api.rounds.get, { roundId, playerId });
  const next = useMutation(api.rounds.next);
  const end = useMutation(api.rounds.end);

  if (!data) {
    return (
      <div className="p-6 poster-border poster-shadow bg-brand-cream text-center font-display font-bold">
        Loading bingo…
      </div>
    );
  }

  if (data.game !== 'bingo') {
    return (
      <div className="p-6 poster-border poster-shadow bg-brand-cream text-center font-display font-bold">
        This round isn&apos;t bingo.
      </div>
    );
  }

  if (data.status === 'ended') {
    return (
      <div className="space-y-4">
        <div className="p-8 poster-border poster-shadow bg-brand-purple text-brand-cream text-center">
          <div className="font-display font-black uppercase text-3xl">Bingo over!</div>
          {data.winners.length > 0 && (
            <div className="mt-3 font-display uppercase">
              Winners: {data.winners.join(', ')}
            </div>
          )}
        </div>
        <Leaderboard rows={data.leaderboard} />
      </div>
    );
  }

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(roundError(e));
    }
  };

  const latestCalled = data.called[data.called.length - 1];
  const wordsLeft = 30 - data.called.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="px-4 py-2 poster-border bg-brand-purple text-brand-cream font-display font-black uppercase text-lg">
          {data.called.length} called
        </div>
        <div className="px-4 py-2 poster-border bg-brand-acid font-display font-black uppercase text-lg">
          {data.entriesCount} playing
        </div>
      </div>

      {/* Big current call — big-screen friendly */}
      {latestCalled ? (
        <div className="p-8 poster-border poster-shadow bg-brand-coral text-center">
          <div className="font-display font-black uppercase text-sm mb-1">Now calling</div>
          <div className="font-display font-black uppercase text-5xl">{latestCalled}</div>
        </div>
      ) : (
        <div className="p-8 poster-border poster-shadow bg-brand-cream text-center">
          <div className="font-display font-black uppercase text-xl">Call the first word!</div>
        </div>
      )}

      {error && (
        <div role="alert" className="p-3 poster-border bg-brand-coral font-display font-bold text-sm text-center">
          {error}
        </div>
      )}

      {/* Host controls */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={wordsLeft === 0}
          onClick={() => run(() => next({ roundId, playerId }))}
          className={`${btn} py-5 bg-brand-acid text-brand-black text-2xl poster-shadow hover:-translate-y-1 transition-transform disabled:opacity-30 disabled:hover:translate-y-0`}
        >
          📣 Call next word
        </button>
        <button
          type="button"
          onClick={() => run(() => end({ roundId, playerId }))}
          className={`${btn} py-5 bg-brand-coral text-brand-black text-2xl hover:-translate-y-1 transition-transform`}
        >
          End
        </button>
      </div>

      {/* Winners */}
      {data.winners.length > 0 && (
        <div className="p-4 poster-border poster-shadow bg-brand-acid">
          <div className="font-display font-black uppercase text-sm mb-2">🏆 Winners</div>
          <ol className="space-y-1">
            {data.winners.map((name, i) => (
              <li key={`${name}-${i}`} className="font-display font-bold">
                {i + 1}. {name} {i === 0 ? '(60 pts)' : i === 1 ? '(40 pts)' : '(20 pts)'}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* All called words — big-screen friendly scroll */}
      {data.called.length > 0 && (
        <div className="p-3 poster-border bg-brand-cream">
          <div className="font-display font-black uppercase text-xs mb-2 opacity-70">
            Called so far ({wordsLeft} left)
          </div>
          <div className="flex flex-wrap gap-1">
            {data.called.map((w, i) => (
              <span key={`${w}-${i}`} className="px-2 py-1 poster-border bg-white font-display font-bold text-xs uppercase">
                {w}
              </span>
            ))}
          </div>
        </div>
      )}

      <Leaderboard rows={data.leaderboard} />
    </div>
  );
}
