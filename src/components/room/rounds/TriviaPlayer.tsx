'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { getChessPlayerId } from '@/lib/chessOnline';

const btn = 'font-display font-black uppercase poster-border';
export const QUESTION_MS = 20 * 1000;

export function roundError(e: unknown) {
  const msg = e instanceof Error ? e.message : '';
  const m = msg.match(/Uncaught Error: (.+?)(?:\n|$)/);
  return m ? m[1] : 'Something went wrong. Try again.';
}

export function Leaderboard({ rows }: { rows: { name: string; avatar: string; score: number }[] }) {
  return (
    <div className="p-4 poster-border poster-shadow bg-brand-black text-brand-cream">
      <div className="font-display font-black uppercase text-sm mb-2 text-brand-acid">Leaderboard</div>
      <ol className="space-y-1">
        {rows.slice(0, 8).map((r, i) => (
          <li key={`${r.name}-${i}`} className="flex items-center justify-between font-display font-bold text-sm">
            <span>
              <span className="opacity-50 mr-2">{i + 1}.</span>
              {r.avatar} {r.name}
            </span>
            <span>{r.score}</span>
          </li>
        ))}
        {rows.length === 0 && <li className="opacity-60 text-sm">No scores yet — be first!</li>}
      </ol>
    </div>
  );
}

export default function TriviaPlayer({ roundId }: { roundId: Id<'rounds'> }) {
  const [playerId] = useState(() => getChessPlayerId());
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);

  const data = useQuery(api.rounds.get, { roundId, playerId });
  const enter = useMutation(api.rounds.enter);
  const answer = useMutation(api.rounds.answer);

  // Join the round the moment this camper shows up
  useEffect(() => {
    enter({ roundId, playerId }).catch(() => {});
  }, [enter, roundId, playerId]);

  // Countdown clock
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

  if (data.status === 'ended') {
    return (
      <div className="space-y-4">
        <div className="p-8 poster-border poster-shadow bg-brand-purple text-brand-cream text-center">
          <div className="font-display font-black uppercase text-3xl">Trivia over!</div>
          <div className="mt-3 text-xl font-display font-black uppercase">
            You scored <span className="text-brand-acid">{data.me.score}</span> points
          </div>
        </div>
        <Leaderboard rows={data.leaderboard} />
      </div>
    );
  }

  const secsLeft = Math.max(0, Math.ceil((QUESTION_MS - (now - data.stepStartedAt)) / 1000));
  const urgent = data.phase === 'question' && secsLeft <= 5;
  const answeredCurrent = !!data.me.myAnswer;

  const pick = async (choice: number) => {
    try {
      await answer({ roundId, playerId, q: data.step, choice });
    } catch (e) {
      setError(roundError(e));
    }
  };

  return (
    <div className="space-y-4">
      {/* Score strip */}
      <div className="flex items-center justify-between gap-3">
        <div className="px-3 py-2 poster-border bg-brand-acid font-display font-black uppercase text-sm">
          You: {data.me.score} pts
        </div>
        <div className="px-3 py-2 poster-border bg-brand-cream font-display font-black uppercase text-sm">
          Q {data.step + 1} / {data.total}
        </div>
      </div>

      {data.phase === 'question' && (
        <div
          className={`p-3 poster-border text-center font-display font-black uppercase text-2xl ${
            urgent ? 'bg-brand-coral' : 'bg-brand-black text-brand-cream'
          }`}
        >
          {secsLeft}s
        </div>
      )}

      {data.question ? (
        <div className="p-5 poster-border poster-shadow bg-brand-cream">
          <div className="inline-block px-2 py-1 poster-border bg-brand-purple text-brand-cream font-display font-black uppercase text-xs">
            {data.question.category}
          </div>
          <div className="mt-3 font-display font-black text-xl leading-snug">{data.question.q}</div>

          <div className="mt-4 grid gap-3">
            {data.question.options.map((option: string, i: number) => {
              const mine = data.me.myAnswer?.choice === i;
              const isCorrect = data.correct === i;
              const wrongPick = data.phase === 'reveal' && mine && !isCorrect;
              const style =
                data.phase === 'reveal'
                  ? isCorrect
                    ? 'bg-brand-acid'
                    : wrongPick
                      ? 'bg-brand-coral'
                      : 'bg-white opacity-70'
                  : mine
                    ? 'bg-brand-purple text-brand-cream'
                    : 'bg-white hover:bg-brand-acid active:bg-brand-acid';
              return (
                <button
                  key={i}
                  type="button"
                  disabled={answeredCurrent || data.phase !== 'question'}
                  onClick={() => pick(i)}
                  className={`${btn} w-full p-4 text-left text-base transition-colors disabled:cursor-default ${style}`}
                >
                  <span className="mr-2 opacity-60">{String.fromCharCode(65 + i)}.</span>
                  {option}
                  {data.phase === 'reveal' && isCorrect && <span className="float-right">✓</span>}
                  {wrongPick && <span className="float-right">✗</span>}
                </button>
              );
            })}
          </div>

          <div className="mt-4 text-center font-display font-black uppercase text-sm">
            {data.phase === 'question'
              ? answeredCurrent
                ? '🔒 Locked in!'
                : 'Tap your answer'
              : data.me.myAnswer
                ? data.correct === data.me.myAnswer.choice
                  ? 'Correct! Points on the board.'
                  : 'Wrong one — next question!'
                : 'The answer is highlighted.'}
          </div>
        </div>
      ) : (
        <div className="p-6 poster-border poster-shadow bg-brand-cream text-center font-display font-bold">
          Waiting for the host…
        </div>
      )}

      {error && (
        <div role="alert" className="p-3 poster-border bg-brand-coral font-display font-bold text-sm text-center">
          {error}
        </div>
      )}

      <Leaderboard rows={data.leaderboard} />
    </div>
  );
}
