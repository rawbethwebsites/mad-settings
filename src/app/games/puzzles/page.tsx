'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getPlayer, addScore, addBadge, addVaultPiece, Player } from '@/lib/player';
import { WORD_SCRAMBLES, PATTERN_QUESTIONS } from '@/data/gameContent';

type Phase = 'scramble' | 'pattern' | 'done';

export default function PuzzlesGame() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>('scramble');
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none');
  const [timer, setTimer] = useState(30);
  const [solvedCount, setSolvedCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const p = getPlayer();
    if (!p) { router.push('/join'); return; }
    setPlayer(p);
    setMounted(true);
    startTimer();
    return () => stopTimer();
  }, [router]);

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const startTimer = () => {
    stopTimer();
    setTimer(30);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          stopTimer();
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeout = () => {
    // Move to next puzzle on timeout
    nextPuzzle();
  };

  if (!mounted || !player) return null;

  const currentScramble = WORD_SCRAMBLES[puzzleIdx];
  const currentPattern = PATTERN_QUESTIONS[puzzleIdx - WORD_SCRAMBLES.length];

  const nextPuzzle = () => {
    setAnswer('');
    setFeedback('none');
    const nextIdx = puzzleIdx + 1;
    if (nextIdx < WORD_SCRAMBLES.length) {
      setPuzzleIdx(nextIdx);
      startTimer();
    } else if (nextIdx < WORD_SCRAMBLES.length + PATTERN_QUESTIONS.length) {
      setPuzzleIdx(nextIdx);
      setPhase('pattern');
      startTimer();
    } else {
      setPhase('done');
      stopTimer();
      // Award vault piece if score >= 30
      if (score >= 30) {
        addVaultPiece('9');
        addBadge('🧩');
        setPlayer(getPlayer());
      }
    }
  };

  const handleSubmit = () => {
    if (!answer.trim() && phase === 'scramble') return;

    if (phase === 'scramble') {
      if (answer.trim().toUpperCase() === currentScramble.answer) {
        const points = Math.max(5, timer); // more points for faster answers
        setScore(prev => prev + points);
        setSolvedCount(prev => prev + 1);
        setFeedback('correct');
        addScore('puzzles', points);
        setTimeout(() => nextPuzzle(), 1200);
      } else {
        setFeedback('wrong');
        setTimeout(() => setFeedback('none'), 800);
      }
    }
  };

  const handlePatternAnswer = (idx: number) => {
    if (idx === currentPattern.oddOneOut) {
      const points = Math.max(5, timer);
      setScore(prev => prev + points);
      setSolvedCount(prev => prev + 1);
      setFeedback('correct');
      addScore('puzzles', points);
      setTimeout(() => nextPuzzle(), 1500);
    } else {
      setFeedback('wrong');
      setTimeout(() => setFeedback('none'), 800);
    }
  };

  return (
    <main className="min-h-screen bg-brand-cream p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => router.push('/games')} className="font-display font-bold text-sm uppercase hover:text-brand-purple">
            ← BACK
          </button>
          <h1 className="font-display font-black text-3xl uppercase italic">🧩 PUZZLE RUSH</h1>
          <div className="font-display font-black text-xl">{player.avatar}</div>
        </div>

        {/* Timer + Score */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 p-4 poster-border bg-white text-center">
            <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50">TIME</div>
            <div className={`font-display font-black text-3xl ${timer <= 10 ? 'text-brand-coral animate-pulse' : 'text-brand-purple'}`}>
              {timer}s
            </div>
          </div>
          <div className="flex-1 p-4 poster-border bg-white text-center">
            <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50">SCORE</div>
            <div className="font-display font-black text-3xl text-brand-acid">{score}</div>
          </div>
          <div className="flex-1 p-4 poster-border bg-white text-center">
            <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50">SOLVED</div>
            <div className="font-display font-black text-3xl">{solvedCount}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6 h-3 bg-brand-black/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-purple transition-all duration-300"
            style={{ width: `${(puzzleIdx / (WORD_SCRAMBLES.length + PATTERN_QUESTIONS.length)) * 100}%` }}
          />
        </div>

        {/* Scramble phase */}
        {phase === 'scramble' && currentScramble && (
          <div className={`p-8 poster-border poster-shadow mb-6 transition-colors ${
            feedback === 'correct' ? 'bg-brand-acid' :
            feedback === 'wrong' ? 'bg-brand-coral' : 'bg-white'
          }`}>
            <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50 mb-2">
              UNSCRAMBLE THIS WORD
            </div>
            <div className="font-display font-black text-4xl md:text-5xl uppercase italic text-center my-6 tracking-wider">
              {currentScramble.scrambled}
            </div>
            <div className="font-body text-lg text-center text-brand-black/60 italic mb-6">
              Hint: {currentScramble.hint}
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Your answer..."
                disabled={feedback === 'correct'}
                className="flex-1 px-4 py-4 border-4 border-brand-black font-display font-black text-xl uppercase text-center tracking-widest focus:outline-none focus:bg-brand-acid/20"
              />
              <button
                onClick={handleSubmit}
                disabled={!answer.trim() || feedback === 'correct'}
                className="px-6 py-4 bg-brand-purple text-brand-cream font-display font-black uppercase poster-border hover:-translate-y-1 transition-transform disabled:opacity-30"
              >
                CHECK
              </button>
            </div>
          </div>
        )}

        {/* Pattern phase */}
        {phase === 'pattern' && currentPattern && (
          <div className={`p-8 poster-border poster-shadow mb-6 transition-colors ${
            feedback === 'correct' ? 'bg-brand-acid' :
            feedback === 'wrong' ? 'bg-brand-coral' : 'bg-white'
          }`}>
            <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50 mb-2">
              WHICH ONE DOESN'T BELONG?
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              {currentPattern.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handlePatternAnswer(i)}
                  disabled={feedback === 'correct'}
                  className="aspect-square text-6xl flex items-center justify-center border-4 border-brand-black hover:bg-brand-acid/20 hover:scale-105 transition-all disabled:opacity-50"
                >
                  {opt}
                </button>
              ))}
            </div>
            {feedback === 'correct' && (
              <div className="mt-4 text-center font-display font-bold text-sm uppercase text-brand-purple">
                ✓ {currentPattern.reason}
              </div>
            )}
          </div>
        )}

        {/* Feedback */}
        {feedback === 'correct' && (
          <div className="text-center font-display font-black text-2xl uppercase text-brand-purple animate-pulse">
            ✓ CORRECT!
          </div>
        )}
        {feedback === 'wrong' && (
          <div className="text-center font-display font-black text-2xl uppercase text-brand-coral animate-pulse">
            ✗ TRY AGAIN!
          </div>
        )}

        {/* Done screen */}
        {phase === 'done' && (
          <div className="p-8 poster-border poster-shadow bg-brand-purple text-brand-cream text-center">
            <div className="text-6xl mb-4">🧩</div>
            <h2 className="font-display font-black text-4xl uppercase italic mb-2">PUZZLE RUSH COMPLETE!</h2>
            <p className="font-body text-xl mb-4">You scored {score} points and solved {solvedCount} puzzles.</p>
            {score >= 30 && (
              <p className="font-display font-black text-lg uppercase text-brand-acid bg-brand-black p-2 mb-4">
                VAULT PIECE UNLOCKED: 9
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => router.push('/games')} className="flex-1 py-3 bg-brand-cream text-brand-purple font-display font-black uppercase poster-border">
                GAME HUB
              </button>
              <button onClick={() => router.push('/games/vault')} className="flex-1 py-3 bg-brand-black text-brand-cream font-display font-black uppercase poster-border">
                THE VAULT →
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}