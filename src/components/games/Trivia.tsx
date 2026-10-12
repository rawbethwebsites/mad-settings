'use client';

import { useEffect, useMemo, useState } from 'react';
import { Btn, Panel, Result } from '@/components/arcade/ui';
import { TRIVIA, type TriviaQuestion } from '@/data/triviaQuestions';

const COUNT = 10;
const SECONDS = 15;

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);
const pickSet = (): TriviaQuestion[] => shuffle(TRIVIA).slice(0, COUNT);

export default function Trivia({ award }: { award: (n: number) => void }) {
  const [round, setRound] = useState(0);
  const set = useMemo(() => pickSet(), [round]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [left, setLeft] = useState(SECONDS);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [started, setStarted] = useState(false);

  const q = set[i];
  const done = i >= COUNT;
  const locked = chosen !== null;

  const answer = (idx: number | null) => {
    if (locked) return;
    const ok = idx === q.answer;
    setChosen(idx ?? -1);
    if (ok) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setCorrect(c => c + 1);
      setScore(s => s + 10 + left + (nextStreak > 2 ? 5 : 0));
    } else {
      setStreak(0);
    }
  };

  // Countdown for the current question
  useEffect(() => {
    if (!started || done || locked) return;
    const t = window.setTimeout(() => {
      if (left <= 1) answer(null);
      else setLeft(left - 1);
    }, 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, done, locked, left]);

  const next = () => {
    const ni = i + 1;
    setI(ni);
    setChosen(null);
    setLeft(SECONDS);
    if (ni >= COUNT) award(score);
  };

  const again = () => {
    setRound(r => r + 1);
    setI(0); setChosen(null); setLeft(SECONDS); setScore(0); setStreak(0); setCorrect(0);
  };

  if (!started) {
    return (
      <Panel>
        <p className="font-body text-lg mb-4">
          {COUNT} questions about Nigeria — geography, history, food, music and sport. {SECONDS} seconds each. Faster answers score more, and streaks earn a bonus.
        </p>
        <Btn className="w-full" onClick={() => setStarted(true)}>START →</Btn>
      </Panel>
    );
  }

  if (done) {
    const great = correct >= 7;
    return (
      <Result
        tone={great ? 'win' : correct >= 4 ? 'draw' : 'lose'}
        emoji={great ? '🏆' : correct >= 4 ? '👍' : '📚'}
        title={`${correct} / ${COUNT} CORRECT`}
        detail={great ? 'You know your Naija!' : 'Keep learning — go again!'}
        points={score}
        onAgain={again}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between font-display font-black uppercase text-sm mb-2">
        <span>Q {i + 1} / {COUNT}</span>
        <span>SCORE {score}</span>
        <span>{streak > 1 ? `🔥 ${streak}` : ''}</span>
      </div>
      <div className="h-3 poster-border bg-white mb-4" aria-hidden>
        <div className={`h-full ${left <= 5 ? 'bg-brand-coral' : 'bg-brand-acid'} transition-all`} style={{ width: `${(left / SECONDS) * 100}%` }} />
      </div>

      <Panel>
        <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-purple mb-2">{q.category}</div>
        <h2 className="font-display font-black text-2xl leading-tight mb-5">{q.q}</h2>
        <div className="space-y-3">
          {q.options.map((o, idx) => {
            const isAnswer = idx === q.answer;
            const style = !locked
              ? 'bg-brand-cream hover:bg-brand-acid'
              : isAnswer
                ? 'bg-brand-acid'
                : chosen === idx
                  ? 'bg-brand-coral'
                  : 'bg-white opacity-50';
            return (
              <button key={o} onClick={() => answer(idx)} disabled={locked}
                className={`w-full text-left px-4 py-3 poster-border font-display font-bold ${style}`}>
                {o}
              </button>
            );
          })}
        </div>
      </Panel>

      {locked && (
        <div className="mt-4">
          <p className="font-display font-black uppercase text-center mb-3">
            {chosen === q.answer ? '✓ CORRECT!' : chosen === -1 ? '⏱ TIME UP' : '✗ NOT QUITE'}
          </p>
          <Btn variant="dark" className="w-full" onClick={next}>{i + 1 >= COUNT ? 'SEE RESULTS →' : 'NEXT →'}</Btn>
        </div>
      )}
    </div>
  );
}
