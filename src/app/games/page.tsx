'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPlayer, getTotalScore, clearPlayer, Player } from '@/lib/player';
import { VAULT_PIECES } from '@/data/gameContent';

const GAMES = [
  { id: 'bingo', name: 'SMART BINGO', emoji: '🎯', tagline: 'Classic. Upgraded.', path: '/games/bingo', color: 'bg-brand-purple' },
  { id: 'search', name: 'ULTIMATE SEARCH', emoji: '🔍', tagline: 'Find it. Scan it.', path: '/games/search', color: 'bg-brand-acid' },
  { id: 'puzzles', name: 'PUZZLE RUSH', emoji: '🧩', tagline: 'Think fast.', path: '/games/puzzles', color: 'bg-brand-coral' },
  { id: 'vault', name: 'THE VAULT', emoji: '🔐', tagline: 'Crack the code.', path: '/games/vault', color: 'bg-brand-black' },
];

export default function GamesHub() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const p = getPlayer();
    if (!p) {
      router.push('/join');
      return;
    }
    const timer = window.setTimeout(() => {
      setPlayer(p);
      setMounted(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router]);

  if (!mounted || !player) return null;

  const totalScore = getTotalScore(player);

  const handleLeave = () => {
    clearPlayer();
    router.push('/');
  };

  return (
    <main className="min-h-screen bg-brand-cream p-6">
      <div className="max-w-4xl mx-auto">
        {/* Scorecard Header */}
        <div className="mb-8 p-6 poster-border poster-shadow bg-brand-black text-brand-cream">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{player.avatar}</div>
              <div>
                <div className="font-display font-black text-2xl uppercase">{player.name}</div>
                <div className="font-display font-bold text-sm uppercase tracking-widest text-brand-acid">
                  ROOM: {player.roomCode}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-display font-bold text-xs uppercase tracking-widest opacity-50">TOTAL SCORE</div>
              <div className="font-display font-black text-4xl text-brand-acid">{totalScore}</div>
            </div>
          </div>

          {/* Individual scores */}
          <div className="grid grid-cols-4 gap-2 mt-6">
            {GAMES.map(g => (
              <div key={g.id} className="text-center p-2 border-2 border-brand-cream/20">
                <div className="text-lg">{g.emoji}</div>
                <div className="font-display font-black text-xl">{player.scores[g.id as keyof typeof player.scores]}</div>
              </div>
            ))}
          </div>

          {/* Vault pieces */}
          {player.vaultPieces.length > 0 && (
            <div className="mt-4 text-center">
              <div className="font-display font-bold text-xs uppercase tracking-widest opacity-50 mb-2">
                VAULT PIECES COLLECTED
              </div>
              <div className="flex justify-center gap-2">
                {VAULT_PIECES.map(vp => (
                  <div
                    key={vp.id}
                    className={`w-10 h-10 flex items-center justify-center font-display font-black text-lg border-2 ${
                      player.vaultPieces.includes(vp.piece)
                        ? 'bg-brand-acid text-brand-black border-brand-acid'
                        : 'border-brand-cream/20 text-brand-cream/20'
                    }`}
                  >
                    {player.vaultPieces.includes(vp.piece) ? vp.piece : '?'}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Badges */}
          {player.badges.length > 0 && (
            <div className="mt-4 text-center">
              <div className="font-display font-bold text-xs uppercase tracking-widest opacity-50 mb-1">BADGES</div>
              <div className="text-2xl">{player.badges.join(' ')}</div>
            </div>
          )}
        </div>

        {/* Game Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {GAMES.map(g => (
            <button
              key={g.id}
              onClick={() => router.push(g.path)}
              className={`group relative p-8 poster-border poster-shadow ${g.color} text-brand-cream text-left hover:-translate-y-2 hover:-translate-x-2 transition-all overflow-hidden`}
            >
              <div className="absolute top-0 right-0 text-7xl opacity-20 group-hover:opacity-30 transition-opacity">
                {g.emoji}
              </div>
              <div className="relative z-10">
                <div className="text-5xl mb-4">{g.emoji}</div>
                <h2 className="font-display font-black text-3xl uppercase italic mb-1">{g.name}</h2>
                <p className="font-body text-lg opacity-80">{g.tagline}</p>
                <div className="mt-4 inline-block px-4 py-2 bg-brand-cream text-brand-black font-display font-bold text-xs uppercase tracking-widest group-hover:bg-brand-acid transition-colors">
                  PLAY →
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Leave button */}
        <button
          onClick={handleLeave}
          className="w-full py-3 border-4 border-brand-black font-display font-bold uppercase text-sm tracking-widest hover:bg-brand-black hover:text-brand-cream transition-colors"
        >
          LEAVE GAME
        </button>
      </div>
    </main>
  );
}