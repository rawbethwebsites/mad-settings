'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { getChessPlayerId } from '@/lib/chessOnline';
import { Leaderboard, roundError } from './TriviaPlayer';

const btn = 'font-display font-black uppercase poster-border';

// All winning lines on a 5x5 card
const LINES: number[][] = [];
for (let r = 0; r < 5; r++) LINES.push([0, 1, 2, 3, 4].map((c) => r * 5 + c));
for (let c = 0; c < 5; c++) LINES.push([0, 1, 2, 3, 4].map((r) => r * 5 + c));
LINES.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);

export default function BingoPlayer({ roundId }: { roundId: Id<'rounds'> }) {
  const [playerId] = useState(() => getChessPlayerId());
  const [marked, setMarked] = useState<Set<number>>(new Set([12])); // FREE always marked
  const [error, setError] = useState<string | null>(null);
  const [winMsg, setWinMsg] = useState<string | null>(null);

  const data = useQuery(api.rounds.get, { roundId, playerId });
  const enter = useMutation(api.rounds.enter);
  const claim = useMutation(api.rounds.claim);

  useEffect(() => {
    enter({ roundId, playerId }).catch(() => {});
  }, [enter, roundId, playerId]);

  // Find the first completed line with all its cells called
  const winnableLine = useMemo(() => {
    if (!data || data.game !== 'bingo' || !data.card) return null;
    for (const line of LINES) {
      const allMarked = line.every((c) => marked.has(c));
      const allCalled = line.every((c) => data.card![c] === 'FREE' || data.called.includes(data.card![c]));
      if (allMarked && allCalled) return line;
    }
    return null;
  }, [data, marked]);

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
          <div className="mt-3 text-xl font-display font-black uppercase">
            You scored <span className="text-brand-acid">{data.me.score}</span> points
          </div>
          {data.winners.length > 0 && (
            <div className="mt-3 text-sm font-display uppercase">
              Winners: {data.winners.join(', ')}
            </div>
          )}
        </div>
        <Leaderboard rows={data.leaderboard} />
      </div>
    );
  }

  const toggle = (cell: number) => {
    if (!data.card) return;
    const word = data.card[cell];
    if (word !== 'FREE' && !data.called.includes(word)) return; // only mark called words
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(cell)) {
        if (cell !== 12) next.delete(cell); // FREE stays marked
      } else {
        next.add(cell);
      }
      return next;
    });
  };

  const shout = async () => {
    if (!winnableLine) return;
    setError(null);
    try {
      const r = await claim({ roundId, playerId, cells: winnableLine });
      setWinMsg(`BINGO! +${r.pts} pts — you came in #${r.place}!`);
    } catch (e) {
      setError(roundError(e));
    }
  };

  const latestCalled = data.called[data.called.length - 1];
  const alreadyWon = data.winners.length > 0 && data.card && winMsg === null && data.me.score > 0;

  return (
    <div className="space-y-4">
      {/* Score + called count */}
      <div className="flex items-center justify-between gap-3">
        <div className="px-3 py-2 poster-border bg-brand-acid font-display font-black uppercase text-sm">
          You: {data.me.score} pts
        </div>
        <div className="px-3 py-2 poster-border bg-brand-cream font-display font-black uppercase text-sm">
          {data.called.length} called
        </div>
      </div>

      {/* Latest call */}
      {latestCalled && (
        <div className="p-4 poster-border poster-shadow bg-brand-coral text-center">
          <div className="font-display font-black uppercase text-xs mb-1">Latest call</div>
          <div className="font-display font-black uppercase text-2xl">{latestCalled}</div>
        </div>
      )}

      {!data.card ? (
        <div className="p-6 poster-border poster-shadow bg-brand-cream text-center font-display font-bold">
          Dealing your card…
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-1">
          {/* Column headers */}
          {['B', 'I', 'N', 'G', 'O'].map((h) => (
            <div key={h} className="p-1 poster-border bg-brand-purple text-brand-cream text-center font-display font-black text-lg">
              {h}
            </div>
          ))}
          {data.card.map((word, cell) => {
            const isMarked = marked.has(cell);
            const isCalled = word === 'FREE' || data.called.includes(word);
            const isLatest = word === latestCalled;
            return (
              <button
                key={cell}
                type="button"
                onClick={() => toggle(cell)}
                disabled={!isCalled && word !== 'FREE'}
                className={`aspect-square p-0.5 poster-border font-display font-black uppercase text-[10px] leading-tight transition-colors ${
                  isMarked
                    ? 'bg-brand-acid'
                    : isCalled
                      ? 'bg-brand-cream hover:bg-brand-acid'
                      : 'bg-white opacity-60'
                } ${isLatest && !isMarked ? 'ring-2 ring-brand-coral' : ''}`}
              >
                {word === 'FREE' ? '⭐' : word}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div role="alert" className="p-3 poster-border bg-brand-coral font-display font-bold text-sm text-center">
          {error}
        </div>
      )}
      {winMsg && (
        <div className="p-4 poster-border poster-shadow bg-brand-acid text-center font-display font-black uppercase">
          {winMsg}
        </div>
      )}
      {alreadyWon && !winMsg && (
        <div className="p-3 poster-border bg-brand-purple text-brand-cream text-center font-display font-bold uppercase text-sm">
          Someone already shouted BINGO! — keep playing
        </div>
      )}

      <button
        type="button"
        disabled={!winnableLine}
        onClick={shout}
        className={`${btn} w-full py-5 text-2xl bg-brand-coral text-brand-black poster-shadow hover:-translate-y-1 transition-transform disabled:opacity-30 disabled:hover:translate-y-0`}
      >
        🎉 BINGO!
      </button>

      {/* Called word strip */}
      {data.called.length > 0 && (
        <div className="p-3 poster-border bg-brand-cream">
          <div className="font-display font-black uppercase text-xs mb-2 opacity-70">Called words</div>
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
