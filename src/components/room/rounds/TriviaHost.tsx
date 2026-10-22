'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { getChessPlayerId } from '@/lib/chessOnline';
import { Leaderboard, QUESTION_MS, roundError } from './TriviaPlayer';

const btn = 'font-display font-black uppercase poster-border';

export default function TriviaHost({ roundId }: { roundId: Id<'rounds'> }) {
  const [playerId] = useState(() => getChessPlayerId());
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);

  const data = useQuery(api.rounds.get, { roundId, playerId });
  const reveal = useMutation(api.rounds.reveal);
  const next = useMutation(api.rounds.next);
  const end = useMutation(api.rounds.end);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(t);
  }, []);

  const step = data?.step;
  const phase = data?.phase;
  // Clear error whenever the round moves on
  const errorKey = `${step}-${phase}`;
  useEffect(() => {
    const t = window.setTimeout(() => setError(null), 0);
    return () => window.clearTimeout(t);
  }, [errorKey]);

  if (!data) {
    return (
      <div className="p-6 poster-border poster-shadow bg-brand-cream text-center font-display font-bold">
        Loading trivia…
      </div>
    );
  }

  if (data.game !== 'trivia') {
    return (
      <div className="p-6 poster-border poster-shadow bg-brand-cream text-center font-display font-bold">
        This round isn&apos;t trivia.
      </div>
    );
  }

  const secsLeft = Math.max(0, Math.ceil((QUESTION_MS - (now - data.stepStartedAt)) / 1000));
  const urgent = data.phase === 'question' && secsLeft <= 5;

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      setError(roundError(e));
    }
  };

  if (data.status === 'ended') {
    return (
      <div className="space-y-4">
        <div className="p-8 poster-border poster-shadow bg-brand-purple text-brand-cream text-center">
          <div className="font-display font-black uppercase text-3xl">Trivia over!</div>
          <div className="mt-2 text-lg font-display font-bold uppercase">Final scores below</div>
        </div>
        <Leaderboard rows={data.leaderboard} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header strip — big-screen friendly */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="px-4 py-2 poster-border bg-brand-purple text-brand-cream font-display font-black uppercase text-lg">
          Q {data.step + 1} / {data.total}
        </div>
        {data.phase === 'question' && (
          <div
            className={`px-4 py-2 poster-border font-display font-black uppercase text-2xl ${
              urgent ? 'bg-brand-coral' : 'bg-brand-black text-brand-cream'
            }`}
          >
            {secsLeft}s
          </div>
        )}
        <div className="px-4 py-2 poster-border bg-brand-acid font-display font-black uppercase text-lg">
          {data.answeredCount} / {data.entriesCount} answered
        </div>
      </div>

      {data.question ? (
        <div className="p-5 poster-border poster-shadow bg-brand-cream">
          <div className="inline-block px-2 py-1 poster-border bg-brand-purple text-brand-cream font-display font-black uppercase text-xs">
            {data.question.category}
          </div>
          <div className="mt-3 font-display font-black text-2xl leading-snug">{data.question.q}</div>

          <div className="mt-4 grid gap-3">
            {data.question.options.map((option: string, i: number) => (
              <div
                key={i}
                className={`p-4 poster-border font-display font-bold text-lg ${
                  data.phase === 'reveal' && data.correct === i ? 'bg-brand-acid' : 'bg-white'
                }`}
              >
                <span className="mr-2 opacity-60">{String.fromCharCode(65 + i)}.</span>
                {option}
                {data.phase === 'reveal' && data.correct === i && <span className="float-right">✓</span>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-6 poster-border poster-shadow bg-brand-cream text-center font-display font-bold">
          Waiting…
        </div>
      )}

      {error && (
        <div role="alert" className="p-3 poster-border bg-brand-coral font-display font-bold text-sm text-center">
          {error}
        </div>
      )}

      {/* Host controls */}
      <div className="grid grid-cols-2 gap-3">
        {data.phase === 'question' ? (
          <button
            type="button"
            onClick={() => run(() => reveal({ roundId, playerId }))}
            className={`${btn} py-4 bg-brand-acid text-brand-black text-xl poster-shadow hover:-translate-y-1 transition-transform`}
          >
            Reveal
          </button>
        ) : (
          <button
            type="button"
            onClick={() => run(() => next({ roundId, playerId }))}
            className={`${btn} py-4 bg-brand-purple text-brand-cream text-xl poster-shadow hover:-translate-y-1 transition-transform`}
          >
            {data.step + 1 >= data.total ? 'Finish' : 'Next'}
          </button>
        )}
        <button
          type="button"
          onClick={() => run(() => end({ roundId, playerId }))}
          className={`${btn} py-4 bg-brand-coral text-brand-black text-xl hover:-translate-y-1 transition-transform`}
        >
          End
        </button>
      </div>

      <Leaderboard rows={data.leaderboard} />
    </div>
  );
}
