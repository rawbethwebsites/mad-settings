import React from 'react';
import { play } from '@/lib/sfx';
import type { OnlineProps } from '@/lib/rules/types';

type RaceView = {
  seed?: number;
  myScore?: number | null;
  allDone?: boolean;
  finished?: (number | null)[];
  scores?: number[];
};

type RaceAction = { score: number };

export function RaceOnline({ view, seat, names, act }: OnlineProps<RaceView, RaceAction>) {
  const seed = view?.seed ?? 0;
  const allDone = view?.allDone ?? false;
  const finished = view?.finished ?? [];
  const scores = view?.scores ?? [];

  const [scoreInput, setScoreInput] = React.useState<string>('');
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    const n = parseInt(scoreInput, 10);
    if (busy) return;
    if (isNaN(n) || n < 0 || n > 1000) { play('error'); return; }
    setBusy(true);
    try { await act({ score: n }); play('place'); }
    catch { play('error'); }
    finally { setBusy(false); }
  };

  const myIdx = seat ?? 0;
  const myFinished = finished[myIdx] !== null;

  return (
    <div data-online-board="race">
      <p className="mb-2 text-center font-body text-xs text-brand-black/60" aria-live="polite">
        Seed {seed} · {finished.filter(score => score !== null).length}/{names.length} submitted
      </p>
      {!myFinished && !allDone && (
        <div className="p-4 poster-border poster-shadow bg-white text-center">
          <label htmlFor="race-score" className="block mb-3 font-body text-sm">Play your solo version with this seed, then enter your score.</label>
          <input id="race-score" inputMode="numeric" value={scoreInput} onChange={e=>setScoreInput(e.target.value)} placeholder="Score 0-1000" className="w-full p-3 border-2 border-black font-body text-lg mb-3" />
          <button data-sfx="none" onClick={submit} disabled={!scoreInput || busy} className="w-full py-4 poster-border bg-brand-purple text-brand-cream font-display font-black text-xl uppercase">Submit Score</button>
        </div>
      )}
      {myFinished && !allDone && <p className="p-4 poster-border bg-white text-center font-body text-sm">Score submitted. Waiting for the other campers.</p>}
      {allDone && (
        <div className="mt-6 p-8 poster-border poster-shadow text-center bg-brand-acid">
          <div className="text-6xl mb-3">🏆</div>
          <h2 className="font-display font-black text-3xl uppercase italic mb-2">RESULTS</h2>
          <div className="font-body">
            {names.map((n:string,i:number)=>(<div key={i}>{n}: {scores[i] ?? '—'}</div>))}
          </div>
        </div>
      )}
    </div>
  );
}
