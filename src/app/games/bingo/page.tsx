'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPlayer, addScore, addBadge, addVaultPiece } from '@/lib/player';
import { BINGO_WORDS } from '@/data/gameContent';
import { Player } from '@/lib/player';

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function BingoGame() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [mounted, setMounted] = useState(false);
  const [grid, setGrid] = useState<string[]>([]);
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [called, setCalled] = useState<Set<string>>(new Set());
  const [currentCall, setCurrentCall] = useState('');
  const [won, setWon] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const p = getPlayer();
    if (!p) { router.push('/join'); return; }
    setPlayer(p);
    // Generate 5x5 grid (25 words, center is FREE)
    const words = shuffleArray(BINGO_WORDS).slice(0, 25);
    words[12] = 'FREE';
    setGrid(words);
    setMarked(new Set([12])); // center is free
    setMounted(true);
  }, [router]);

  if (!mounted || !player) return null;

  const callNext = () => {
    const available = grid.filter((w, i) => w !== 'FREE' && !called.has(w) && !marked.has(i));
    if (available.length === 0) return;
    const word = available[Math.floor(Math.random() * available.length)];
    setCalled(prev => new Set(prev).add(word));
    setCurrentCall(word);
  };

  const toggleMark = (index: number) => {
    const word = grid[index];
    if (word === 'FREE' || !called.has(word)) return;
    const newMarked = new Set(marked);
    if (newMarked.has(index)) {
      newMarked.delete(index);
    } else {
      newMarked.add(index);
    }
    setMarked(newMarked);
    checkWin(newMarked);
  };

  const checkWin = (marks: Set<number>) => {
    const lines = [
      [0,1,2,3,4], [5,6,7,8,9], [10,11,12,13,14], [15,16,17,18,19], [20,21,22,23,24], // rows
      [0,5,10,15,20], [1,6,11,16,21], [2,7,12,17,22], [3,8,13,18,23], [4,9,14,19,24], // cols
      [0,6,12,18,24], [4,8,12,16,20], // diagonals
    ];
    for (const line of lines) {
      if (line.every(i => marks.has(i))) {
        if (!won) {
          setWon(true);
          const points = 20;
          setScore(points);
          addScore('bingo', points);
          addVaultPiece('7');
          addBadge('🎯');
          setPlayer(getPlayer());
        }
        return;
      }
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
          <h1 className="font-display font-black text-3xl uppercase italic">🎯 SMART BINGO</h1>
          <div className="font-display font-black text-xl">{player.avatar} {player.name}</div>
        </div>

        {/* Called word display */}
        <div className="mb-6 p-6 poster-border poster-shadow bg-brand-purple text-brand-cream text-center">
          {currentCall ? (
            <>
              <div className="font-display font-bold text-xs uppercase tracking-widest opacity-60 mb-1">NOW CALLING</div>
              <div className="font-display font-black text-4xl uppercase">{currentCall}</div>
            </>
          ) : (
            <div className="font-display font-black text-xl uppercase opacity-60">TAP "CALL NEXT" TO START</div>
          )}
          <button
            onClick={callNext}
            disabled={won}
            className="mt-4 px-6 py-3 bg-brand-acid text-brand-black font-display font-black uppercase poster-border hover:-translate-y-1 transition-transform disabled:opacity-30"
          >
            CALL NEXT →
          </button>
        </div>

        {/* Bingo Grid */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          {grid.map((word, i) => {
            const isMarked = marked.has(i);
            const isCalled = called.has(word) || word === 'FREE';
            return (
              <button
                key={i}
                onClick={() => toggleMark(i)}
                disabled={won || !isCalled}
                className={`aspect-square flex items-center justify-center text-center font-display font-black text-xs md:text-sm uppercase p-1 border-2 transition-all ${
                  isMarked
                    ? 'bg-brand-purple text-brand-cream border-brand-purple scale-95'
                    : isCalled
                      ? 'bg-brand-acid text-brand-black border-brand-black animate-pulse'
                      : 'bg-white text-brand-black/40 border-brand-black/20'
                }`}
              >
                {word}
              </button>
            );
          })}
        </div>

        {/* Win overlay */}
        {won && (
          <div className="fixed inset-0 bg-brand-black/80 flex items-center justify-center z-50 p-6">
            <div className="bg-brand-cream poster-border poster-shadow p-8 text-center max-w-sm">
              <div className="text-6xl mb-4">🎯</div>
              <h2 className="font-display font-black text-4xl uppercase italic text-brand-purple mb-2">BINGO!</h2>
              <p className="font-body text-lg mb-4">You scored +{score} points!</p>
              <p className="font-display font-bold text-sm uppercase text-brand-acid bg-brand-black p-2 mb-4">
                VAULT PIECE UNLOCKED: 7
              </p>
              <div className="flex gap-3">
                <button onClick={() => router.push('/games')} className="flex-1 py-3 bg-brand-purple text-brand-cream font-display font-black uppercase poster-border">
                  GAME HUB
                </button>
                <button onClick={() => router.push('/games/vault')} className="flex-1 py-3 bg-brand-black text-brand-cream font-display font-black uppercase poster-border">
                  THE VAULT →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}