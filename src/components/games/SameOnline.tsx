import React from 'react';
import { play } from '@/lib/sfx';
import type { OnlineProps } from '@/lib/rules/types';
import type { SameAction } from '@/lib/rules/same';

type SameView = {
  prompt: string;
  idx: number;
  lives: number[];
  myWord: string | null;
  others: (string | null)[];
  winner: number | null;
  finished: boolean;
};

export function SameOnline({ view, seat, names, act }: OnlineProps<SameView, SameAction>) {
  const [busy, setBusy] = React.useState(false);
  const [word, setWord] = React.useState('');
  const [err, setErr] = React.useState<string | null>(null);

  const send = async () => {
    if (busy) return;
    if (!word.trim()) { play('error'); setErr('Type a word'); return; }
    setErr(null);
    setBusy(true);
    try { await act({ word }); play('place'); setWord(''); } catch(e){ play('error'); setErr(e instanceof Error ? e.message : 'Error'); } finally { setBusy(false); }
  };

  const prompt = view?.prompt ?? '...';
  const lives = view?.lives ?? [];
  const myWord = view?.myWord;
  const finished = view?.finished;
  const winner = view?.winner;

  return (
    <div>
      <div className="p-3 poster-border text-center font-display font-black uppercase mb-4 bg-brand-coral">PROMPT: {prompt}</div>
      <div className="grid gap-2 mb-4">
        {names.map((n:string,i:number)=>(
          <div key={i} className={`p-3 poster-border font-display font-black uppercase ${i===seat?'bg-brand-acid':'bg-white'}`}>
            {n} · ❤️ {lives[i] ?? 0}
          </div>
        ))}
      </div>
      {!finished && (
        <div className="p-6 poster-border poster-shadow bg-white text-center">
          <input value={word} onChange={e=>setWord(e.target.value)} placeholder="Type one word…" className="w-full p-3 border-2 border-black font-body text-lg mb-3" />
          <button data-sfx="none" onClick={send} disabled={busy || !word.trim()} className="w-full py-4 poster-border bg-brand-purple text-brand-cream font-display font-black text-xl uppercase disabled:opacity-50">Submit</button>
          {err && <div className="mt-3 poster-border bg-brand-coral font-display font-bold text-sm text-center">{err}</div>}
          <div className="mt-3 text-sm font-body">
            {myWord ? `You wrote: ${myWord}` : 'Waiting…'}
          </div>
        </div>
      )}
      {finished && (
        <div className={`mt-6 p-8 poster-border poster-shadow text-center ${winner===seat?'bg-brand-acid':'bg-brand-coral'}`}>
          <div className="text-6xl mb-3">{winner===seat?'🏆':'🤝'}</div>
          <h2 className="font-display font-black text-3xl uppercase italic mb-2">{winner===seat?'YOU WIN!': winner===null?'DRAW':'YOU LOSE'}</h2>
        </div>
      )}
    </div>
  );
}
