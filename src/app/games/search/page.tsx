'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPlayer, addScore, addBadge, addVaultPiece, Player } from '@/lib/player';
import { SEARCH_CLUES } from '@/data/gameContent';

export default function SearchGame() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none');
  const [score, setScore] = useState(0);

  useEffect(() => {
    const p = getPlayer();
    if (!p) { router.push('/join'); return; }
    setPlayer(p);
    setMounted(true);
  }, [router]);

  if (!mounted || !player) return null;

  const currentClue = SEARCH_CLUES[currentIdx];

  const handleSubmit = () => {
    if (!answer.trim()) return;

    if (answer.trim().toUpperCase() === currentClue.answer) {
      setFeedback('correct');
      const newSolved = new Set(solved).add(currentClue.id);
      setSolved(newSolved);
      setScore(prev => prev + currentClue.points);
      addScore('search', currentClue.points);

      // After 3 clues solved, unlock vault piece
      if (newSolved.size >= 3) {
        addVaultPiece('3');
        addBadge('🔍');
      }

      setTimeout(() => {
        setFeedback('none');
        setAnswer('');
        if (currentIdx < SEARCH_CLUES.length - 1) {
          setCurrentIdx(currentIdx + 1);
        }
      }, 1500);
    } else {
      setFeedback('wrong');
      setTimeout(() => setFeedback('none'), 1000);
    }
  };

  const skipClue = () => {
    setAnswer('');
    setFeedback('none');
    if (currentIdx < SEARCH_CLUES.length - 1) {
      setCurrentIdx(currentIdx + 1);
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
          <h1 className="font-display font-black text-3xl uppercase italic">🔍 ULTIMATE SEARCH</h1>
          <div className="font-display font-black text-xl">{player.avatar}</div>
        </div>

        {/* Progress */}
        <div className="mb-6 flex items-center gap-2">
          {SEARCH_CLUES.map((c, i) => (
            <div
              key={c.id}
              className={`flex-1 h-2 rounded-full ${
                solved.has(c.id) ? 'bg-brand-acid' : i === currentIdx ? 'bg-brand-purple' : 'bg-brand-black/10'
              }`}
            />
          ))}
        </div>

        {/* Score */}
        <div className="mb-6 text-center">
          <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50">SCORE</div>
          <div className="font-display font-black text-3xl text-brand-purple">{score}</div>
        </div>

        {/* Clue card */}
        <div className={`p-8 poster-border poster-shadow mb-6 transition-colors ${
          feedback === 'correct' ? 'bg-brand-acid' :
          feedback === 'wrong' ? 'bg-brand-coral' : 'bg-white'
        }`}>
          <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50 mb-2">
            CLUE {currentIdx + 1} / {SEARCH_CLUES.length}
          </div>
          <div className="font-display font-black text-2xl md:text-3xl uppercase italic mb-4">
            {currentClue.clue}
          </div>
          <div className="font-display font-bold text-sm uppercase text-brand-purple">
            +{currentClue.points} POINTS
          </div>
        </div>

        {/* Answer input */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Enter the code word..."
            maxLength={20}
            disabled={feedback === 'correct'}
            className={`flex-1 px-4 py-4 border-4 border-brand-black font-display font-black text-xl uppercase text-center tracking-widest focus:outline-none transition-colors ${
              feedback === 'correct' ? 'bg-brand-acid' :
              feedback === 'wrong' ? 'bg-brand-coral/30' : 'focus:bg-brand-acid/20'
            }`}
          />
          <button
            onClick={handleSubmit}
            disabled={!answer.trim() || feedback === 'correct'}
            className="px-6 py-4 bg-brand-purple text-brand-cream font-display font-black uppercase poster-border poster-shadow hover:-translate-y-1 transition-transform disabled:opacity-30"
          >
            CHECK
          </button>
        </div>

        {/* Feedback */}
        {feedback === 'correct' && (
          <div className="text-center font-display font-black text-2xl uppercase text-brand-purple animate-pulse">
            ✓ CORRECT! +{currentClue.points} POINTS
          </div>
        )}
        {feedback === 'wrong' && (
          <div className="text-center font-display font-black text-2xl uppercase text-brand-coral animate-pulse">
            ✗ TRY AGAIN!
          </div>
        )}

        {/* Skip */}
        {feedback === 'none' && (
          <button
            onClick={skipClue}
            className="w-full py-2 font-display font-bold text-sm uppercase text-brand-black/30 hover:text-brand-black/60"
          >
            SKIP THIS CLUE →
          </button>
        )}

        {/* Vault unlock notice */}
        {solved.size >= 3 && !player.vaultPieces.includes('3') && (
          <div className="mt-6 p-4 bg-brand-acid poster-border text-center">
            <div className="font-display font-black text-lg uppercase">VAULT PIECE UNLOCKED: 3</div>
          </div>
        )}

        {/* All done */}
        {currentIdx === SEARCH_CLUES.length - 1 && solved.size === SEARCH_CLUES.length && (
          <div className="mt-6 p-6 bg-brand-purple text-brand-cream poster-border poster-shadow text-center">
            <div className="text-4xl mb-2">🔍</div>
            <div className="font-display font-black text-2xl uppercase italic">ALL CLUES FOUND!</div>
            <button onClick={() => router.push('/games')} className="mt-4 px-6 py-3 bg-brand-cream text-brand-purple font-display font-black uppercase poster-border">
              BACK TO HUB →
            </button>
          </div>
        )}
      </div>
    </main>
  );
}