'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPlayer, addScore, addBadge, addVaultPiece } from '@/lib/player';
import { BINGO_WORDS } from '@/data/gameContent';
import { Player } from '@/lib/player';
import { BingoBoard } from '@/components/boards/BingoBoard';
import { play } from '@/lib/sfx';
import { useResultSound } from '@/lib/useGameSounds';

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
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [score, setScore] = useState(0);
  useResultSound(won ? 'win' : null);

  useEffect(() => {
    const p = getPlayer();
    if (!p) { router.push('/join'); return; }
    const startup = setTimeout(() => {
      setPlayer(p);
      // Generate 5x5 grid (25 words, center is FREE)
      const words = shuffleArray(BINGO_WORDS).slice(0, 25);
      words[12] = 'FREE';
      setGrid(words);
      setMarked(new Set([12])); // center is free
      setMounted(true);
    }, 0);
    return () => clearTimeout(startup);
  }, [router]);

  if (!mounted || !player) return null;

  const callNext = () => {
    const available = grid.filter((w, i) => w !== 'FREE' && !called.has(w) && !marked.has(i));
    if (available.length === 0) return;
    play('card');
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
    if (!checkWin(newMarked)) play('place');
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
          setWinLine(line);
          const points = 20;
          setScore(points);
          addScore('bingo', points);
          addVaultPiece('7');
          addBadge('🎯');
          setPlayer(getPlayer());
        }
        return true;
      }
    }
    return false;
  };

  return (
    <div>
        <button
          data-sfx="none"
          onClick={callNext}
          disabled={won || called.size >= 24}
          className="w-full mb-4 py-4 bg-brand-purple text-brand-cream font-display font-black uppercase poster-border disabled:opacity-40"
        >
          CALL NEXT WORD →
        </button>
        {/* Bingo Grid */}
        <div data-sfx="none"><BingoBoard
          grid={grid}
          marked={marked}
          called={called}
          currentCall={currentCall}
          won={won}
          winLine={winLine}
          onToggle={toggleMark}
        /></div>

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
  );
}