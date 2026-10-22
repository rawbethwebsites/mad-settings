'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { getChessPlayerId } from '@/lib/chessOnline';

const btn = 'font-display font-black uppercase poster-border poster-shadow hover:-translate-y-1 transition-transform';

export default function RoundStartButtons({ code }: { code: string }) {
  const [playerId] = useState(() => getChessPlayerId());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'trivia' | 'bingo' | null>(null);
  const start = useMutation(api.rounds.start);

  const go = async (game: 'trivia' | 'bingo') => {
    setBusy(game);
    setError(null);
    try {
      await start({ code, playerId, game });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      const m = msg.match(/Uncaught Error: (.+?)(?:\n|$)/);
      setError(m ? m[1] : 'Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => go('trivia')}
          className={`${btn} py-4 bg-brand-acid text-brand-black text-lg disabled:opacity-50 disabled:hover:translate-y-0`}
        >
          {busy === 'trivia' ? 'Starting…' : '⚡ Start Trivia'}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => go('bingo')}
          className={`${btn} py-4 bg-brand-coral text-brand-black text-lg disabled:opacity-50 disabled:hover:translate-y-0`}
        >
          {busy === 'bingo' ? 'Starting…' : '🎯 Start Bingo'}
        </button>
      </div>
      {error && (
        <div role="alert" className="p-3 poster-border bg-brand-coral font-display font-bold text-sm text-center">
          {error}
        </div>
      )}
    </div>
  );
}
