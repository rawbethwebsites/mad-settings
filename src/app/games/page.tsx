'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPlayer, getTotalScore, clearPlayer, Player } from '@/lib/player';
import { VAULT_PIECES } from '@/data/gameContent';
import WalletChip from '@/components/wallet/WalletChip';
import { GAMES, GROUPS } from '@/data/games';

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
    <main className="min-h-screen bg-brand-cream text-brand-black p-6">
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

          <WalletChip />

          {/* Individual scores stay available without crowding the game picker. */}
          <details className="mt-4"><summary className="min-h-11 flex items-center cursor-pointer font-display font-bold">＋ Your scores</summary>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mt-2">
            {GAMES.map(g => (
              <div key={g.id} className="text-center p-2 border-2 border-brand-cream/20">
                <div className="text-lg">{g.emoji}</div>
                <div className="font-display font-black text-xl">{player.scores[g.id] ?? 0}</div>
              </div>
            ))}
          </div>

          </details>

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

        <button onClick={() => router.push('/casino')} className="w-full min-h-14 mb-6 p-5 border-4 border-[#d4a017] bg-[#0f3d2e] text-[#f5d76e] shadow-[6px_6px_0_#000] font-display font-black text-xl uppercase text-left flex items-center justify-between gap-3">
          <span>🎰 Casino Night<span className="block font-body font-normal normal-case text-sm text-[#f3efe2]/80">Play your friends for chips. Winner takes the pot.</span></span>
          <span aria-hidden="true">→</span>
        </button>

        <h1 className="font-display font-black text-4xl uppercase italic mb-4">Pick a game</h1>
        <button onClick={() => router.push('/games/tictactoe')} className="w-full min-h-14 mb-6 p-5 poster-border poster-shadow bg-brand-purple text-brand-cream font-display font-black text-xl">
          ▶ Play now · Tic tac toe
        </button>

        {/* Game Cards */}
        {GROUPS.map(group => (
          <section key={group.id} className="mb-8">
            <h2 className="font-display font-black text-xl uppercase tracking-widest mb-4">{group.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {GAMES.filter(g => g.group === group.id).map(g => (
                <button
                  key={g.id}
                  onClick={() => router.push(g.path)}
                  className={`group relative min-h-11 p-5 poster-border ${g.color} text-left hover:-translate-y-2 hover:-translate-x-2 transition-all overflow-hidden`}
                >
                  <div className="absolute top-0 right-0 text-7xl opacity-20 group-hover:opacity-30 transition-opacity">
                    {g.emoji}
                  </div>
                  <div className="relative z-10">
                    <div className="text-4xl mb-3" aria-hidden="true">{g.emoji}</div>
                    <h3 className="font-display font-black text-2xl uppercase italic mb-1">{g.name}</h3>

                    <div className="mt-4 inline-block px-4 py-2 bg-brand-cream text-brand-black font-display font-bold text-xs uppercase tracking-widest group-hover:bg-brand-acid transition-colors">
                      PLAY →
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}

        <button onClick={() => router.push('/connect')} className="w-full min-h-11 mb-4 p-3 poster-border bg-white font-display font-bold">
          🏕 Meet campers →
        </button>
        {/* Leave button */}
        <button
          onClick={handleLeave}
          className="w-full min-h-11 py-3 border-4 border-brand-black font-display font-bold uppercase text-sm tracking-widest hover:bg-brand-black hover:text-brand-cream transition-colors"
        >
          ← Leave games
        </button>
      </div>
    </main>
  );
}