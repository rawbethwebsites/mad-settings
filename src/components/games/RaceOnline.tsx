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
    <div>
      <div className="p-3 poster-border text-center font-display font-black uppercase mb-3 bg-brand-purple text-brand-cream">SEED {seed}</div>
      <div className="p-4 poster-border bg-white mb-4 font-display">
        <div>Play your solo version with this seed.</div>
        <div className="mt-2 text-sm">When done, enter your score and submit.</div>
      </div>
      <div className="grid gap-2 mb-4">
        {names.map((n:string,i:number)=>(
          <div key={i} className={`p-3 poster-border font-display font-black ${i===seat?'bg-brand-acid':'bg-white'}`}>
            {n} · {finished[i] !== null ? `Score: ${finished[i]}` : 'Waiting…'}
          </div>
        ))}
      </div>
      {!myFinished && !allDone && (
        <div className="p-6 poster-border poster-shadow bg-white text-center">
          <input value={scoreInput} onChange={e=>setScoreInput(e.target.value)} placeholder="Score 0-1000" className="w-full p-3 border-2 border-black font-body text-lg mb-3" />
          <button data-sfx="none" onClick={submit} disabled={!scoreInput || busy} className="w-full py-4 poster-border bg-brand-purple text-brand-cream font-display font-black text-xl uppercase">Submit Score</button>
        </div>
      )}
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
