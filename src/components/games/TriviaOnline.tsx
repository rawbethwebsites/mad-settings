import React from 'react';
import type { OnlineProps } from '@/lib/rules/types';
import { seededPick } from '@/lib/seededRandom';
import { TRIVIA } from '@/data/triviaQuestions';
import { Btn } from '@/components/arcade/ui';

const COUNT = 10;
const SECONDS = 15;

function pickSet(seed:number){
  if(seed===null || seed===undefined) return [...TRIVIA].sort(()=>Math.random()-0.5).slice(0,COUNT);
  return seededPick(TRIVIA, COUNT, seed);
}

export function TriviaOnline({ view, seat, names, act }: OnlineProps<any, any>) {
  const seed = view?.seed ?? 0;
  const set = React.useMemo(()=>pickSet(seed), [seed]);
  const [i, setI] = React.useState(0);
  const [chosen, setChosen] = React.useState<number|null>(null);
  const [left, setLeft] = React.useState(SECONDS);
  const [score, setScore] = React.useState(0);
  const [streak, setStreak] = React.useState(0);
  const [started, setStarted] = React.useState(false);
  const myScore = view?.myScore;
  const allDone = view?.allDone;
  const finished = view?.finished ?? [];

  const q = set[i];
  const done = i >= COUNT;

  React.useEffect(()=>{
    if(!started || done || chosen!==null) return;
    const t = window.setTimeout(()=>{ if(left<=1){ setChosen(null); setI(i+1); } else setLeft(l=>l-1); }, 1000);
    return ()=>window.clearTimeout(t);
  }, [started, done, chosen, left, i]);

  const answer = (idx:number|null) => {
    if(chosen!==null) return;
    setChosen(idx ?? -1);
    const ok = idx === q.answer;
    if(ok){
      const ns = streak+1; setStreak(ns); setScore(s=>s + 10 + left + (ns>2?5:0));
    } else { setStreak(0); }
    setTimeout(()=>{ setChosen(null); setLeft(SECONDS); setI(ni=>ni+1); }, 800);
  };

  const submit = async () => {
    await act({ score });
  };

  return (
    <div>
      <div className="p-3 poster-border text-center font-display font-black uppercase mb-3 bg-brand-purple text-brand-cream">SEED {seed} · PLAY</div>
      {!allDone && !done && (
        <div className="p-6 poster-border poster-shadow bg-white text-center">
          <div className="font-display font-black text-2xl uppercase mb-2">{q?.q}</div>
          <div className="grid grid-cols-2 gap-2">
            {q?.options?.map((c:string, idx:number)=>(
              <button key={idx} onClick={()=>answer(idx)} className="p-3 poster-border bg-brand-cream hover:bg-brand-acid">{c}</button>
            ))}
          </div>
          <div className="mt-3 font-display font-bold">{left}s</div>
          <div className="mt-2">Score: {score}</div>
        </div>
      )}
      {done && (
        <div className="p-6 poster-border poster-shadow bg-white text-center">
          <div className="font-display font-black text-2xl uppercase mb-3">Finished {score}</div>
          <button onClick={submit} className="py-3 poster-border bg-brand-purple text-brand-cream font-display font-black uppercase">Submit Score</button>
        </div>
      )}
      {allDone && (
        <div className="mt-4 p-4 poster-border bg-brand-acid text-center font-display font-black">
          Waiting for others… {finished.filter(Boolean).length}/{names.length}
        </div>
      )}
    </div>
  );
}
