'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getPlayer, addScore, addBadge, Player } from '@/lib/player';
import { SAME_EASY, SAME_MEDIUM, SAME_HARD, SAME_FINAL, SAME_POINTS_PER_STEP } from '@/data/gameContent';

type Phase = 'setup' | 'ready' | 'countdown' | 'judge' | 'out' | 'cleared' | 'done';

const pick = (list: string[], n: number) => [...list].sort(() => Math.random() - 0.5).slice(0, n);

// Same ladder for both teams so the climb is fair
const buildLadder = () => [...pick(SAME_EASY, 4), ...pick(SAME_MEDIUM, 3), ...pick(SAME_HARD, 2), SAME_FINAL];

export default function DontSayTheSameThing() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>('setup');
  const [teams, setTeams] = useState(['TEAM 1', 'TEAM 2']);
  const [ladder, setLadder] = useState<string[]>([]);
  const [turn, setTurn] = useState(0);
  const [step, setStep] = useState(0);
  const [results, setResults] = useState<number[]>([]);
  const [count, setCount] = useState(3);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const p = getPlayer();
    if (!p) { router.push('/join'); return; }
    const timer = window.setTimeout(() => {
      setPlayer(p);
      setMounted(true);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [router]);

  if (!mounted || !player) return null;

  const startGame = () => {
    setTeams(teams.map((t, i) => t.trim() || `TEAM ${i + 1}`));
    setLadder(buildLadder());
    setTurn(0);
    setStep(0);
    setResults([]);
    setPhase('ready');
  };

  const sayIt = () => {
    setCount(3);
    setPhase('countdown');
    timerRef.current = setInterval(() => {
      setCount(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase('judge');
          return 0;
        }
        return prev - 1;
      });
    }, 800);
  };

  const endTurn = (reached: number) => {
    const next = [...results, reached];
    setResults(next);
    if (reached > 0) {
      addScore('same', reached * SAME_POINTS_PER_STEP);
      if (reached === ladder.length) addBadge('🤐');
      setPlayer(getPlayer());
    }
    setPhase(reached === ladder.length ? 'cleared' : 'out');
  };

  const different = () => {
    const reached = step + 1;
    if (reached === ladder.length) endTurn(reached);
    else { setStep(reached); setPhase('ready'); }
  };

  const nextTurn = () => {
    if (results.length >= teams.length) { setPhase('done'); return; }
    setTurn(results.length);
    setStep(0);
    setPhase('ready');
  };

  const best = Math.max(...results, 0);
  const winners = teams.filter((_, i) => results[i] === best);

  return (
    <main className="min-h-screen bg-brand-cream text-brand-black p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => router.push('/games')} className="font-display font-bold text-sm uppercase hover:text-brand-purple">
            ← BACK
          </button>
          <h1 className="font-display font-black text-2xl md:text-3xl uppercase italic">🤐 DON&apos;T SAY IT</h1>
          <div className="font-display font-black text-xl">{player.avatar}</div>
        </div>

        {/* Setup */}
        {phase === 'setup' && (
          <div className="p-6 md:p-8 poster-border poster-shadow bg-white">
            <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50 mb-2">HOW TO PLAY</div>
            <ol className="font-body text-lg space-y-2 mb-6 list-decimal pl-5">
              <li>Teams of two. One phone, held by the host.</li>
              <li>A category pops up. On &quot;SAY IT!&quot; both teammates shout one answer at the same time.</li>
              <li>Different answers? Climb to the next category. Same answer? Your run is over.</li>
              <li>It gets harder all the way to Coin Side. Furthest climb wins.</li>
            </ol>
            <div className="space-y-4 mb-6">
              {teams.map((t, i) => (
                <div key={i}>
                  <label htmlFor={`team-${i}`} className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50 block mb-2">
                    TEAM {i + 1} NAME
                  </label>
                  <input
                    id={`team-${i}`}
                    type="text"
                    value={t}
                    onChange={(e) => setTeams(teams.map((x, j) => (j === i ? e.target.value.toUpperCase() : x)))}
                    maxLength={16}
                    className="w-full px-4 py-3 border-4 border-brand-black bg-white text-brand-black placeholder:text-brand-black/40 font-display font-bold text-xl uppercase focus:outline-none focus:bg-brand-acid/20"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              {teams.length < 6 && (
                <button
                  onClick={() => setTeams([...teams, `TEAM ${teams.length + 1}`])}
                  className="px-4 py-4 bg-brand-cream text-brand-black font-display font-black uppercase text-sm poster-border"
                >
                  + TEAM
                </button>
              )}
              <button
                onClick={startGame}
                className="flex-1 py-4 bg-brand-purple text-brand-cream font-display font-black uppercase text-lg poster-border poster-shadow hover:-translate-y-1 transition-transform"
              >
                START →
              </button>
            </div>
          </div>
        )}

        {/* Ladder + play */}
        {['ready', 'countdown', 'judge'].includes(phase) && (
          <>
            <div className="text-center mb-4">
              <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50">UP NOW</div>
              <div className="font-display font-black text-3xl uppercase text-brand-purple">{teams[turn]}</div>
            </div>

            <div className="grid grid-cols-5 gap-1.5 mb-6">
              {ladder.map((c, i) => (
                <div
                  key={c}
                  className={`px-1 py-2 text-center font-display font-bold text-[10px] md:text-xs uppercase leading-tight border-2 border-brand-black ${
                    i < step ? 'bg-brand-acid' : i === step ? 'bg-brand-black text-brand-cream' : 'bg-white text-brand-black/40'
                  }`}
                >
                  {c}
                </div>
              ))}
            </div>

            <div className={`p-8 poster-border poster-shadow text-center mb-6 transition-colors ${phase === 'countdown' ? 'bg-brand-black text-brand-cream' : 'bg-white'}`}>
              <div className={`font-display font-bold text-xs uppercase tracking-widest mb-2 ${phase === 'countdown' ? 'text-brand-cream/60' : 'text-brand-black/50'}`}>
                STEP {step + 1} / {ladder.length}
              </div>
              <div className="font-display font-black text-5xl md:text-6xl uppercase italic my-4 leading-none">{ladder[step]}</div>
              {phase === 'countdown' && (
                <div className="font-display font-black text-8xl text-brand-acid animate-pulse">{count}</div>
              )}
              {phase === 'judge' && (
                <div className="font-display font-black text-4xl uppercase text-brand-coral">SAY IT!</div>
              )}
            </div>

            {phase === 'ready' && (
              <button
                onClick={sayIt}
                className="w-full py-5 bg-brand-purple text-brand-cream font-display font-black uppercase text-2xl poster-border poster-shadow hover:-translate-y-1 transition-transform"
              >
                3 · 2 · 1 →
              </button>
            )}
            {phase === 'judge' && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={different}
                  className="py-5 bg-brand-acid text-brand-black font-display font-black uppercase text-xl poster-border poster-shadow hover:-translate-y-1 transition-transform"
                >
                  ✓ DIFFERENT
                </button>
                <button
                  onClick={() => endTurn(step)}
                  className="py-5 bg-brand-coral text-brand-black font-display font-black uppercase text-xl poster-border poster-shadow hover:-translate-y-1 transition-transform"
                >
                  ✗ SAME
                </button>
              </div>
            )}
          </>
        )}

        {/* End of a team's run */}
        {(phase === 'out' || phase === 'cleared') && (
          <div className={`p-8 poster-border poster-shadow text-center ${phase === 'cleared' ? 'bg-brand-acid' : 'bg-brand-coral'}`}>
            <div className="text-6xl mb-4">{phase === 'cleared' ? '🏆' : '😂'}</div>
            <h2 className="font-display font-black text-4xl uppercase italic mb-2">
              {phase === 'cleared' ? 'FULL LADDER!' : 'SAME THING!'}
            </h2>
            <p className="font-body text-xl mb-6">
              {teams[turn]} cleared {results[results.length - 1]} of {ladder.length}
              {phase === 'out' && <> and went out on <b>{ladder[step]}</b></>}.
            </p>
            <button
              onClick={nextTurn}
              className="w-full py-4 bg-brand-black text-brand-cream font-display font-black uppercase text-lg poster-border"
            >
              {results.length >= teams.length ? 'SEE RESULTS →' : `${teams[results.length]}, YOU'RE UP →`}
            </button>
          </div>
        )}

        {/* Final results */}
        {phase === 'done' && (
          <div className="p-8 poster-border poster-shadow bg-brand-purple text-brand-cream text-center">
            <div className="text-6xl mb-4">🤐</div>
            <h2 className="font-display font-black text-4xl uppercase italic mb-6">
              {winners.length > 1 ? "IT'S A TIE!" : `${winners[0]} WINS!`}
            </h2>
            <div className="space-y-2 mb-6">
              {teams
                .map((t, i) => ({ t, i, r: results[i] ?? 0 }))
                .sort((a, b) => b.r - a.r)
                .map(({ t, i, r }) => (
                  <div key={i} className={`flex justify-between px-4 py-3 border-2 border-brand-cream font-display font-black uppercase ${r === best ? 'bg-brand-acid text-brand-black' : ''}`}>
                    <span>{t}</span>
                    <span>{r} / {ladder.length}</span>
                  </div>
                ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => router.push('/games')} className="flex-1 py-3 bg-brand-cream text-brand-purple font-display font-black uppercase poster-border">
                GAME HUB
              </button>
              <button onClick={startGame} className="flex-1 py-3 bg-brand-black text-brand-cream font-display font-black uppercase poster-border">
                PLAY AGAIN →
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
