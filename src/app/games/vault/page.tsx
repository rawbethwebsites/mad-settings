'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPlayer, addScore, addBadge, Player } from '@/lib/player';
import { VAULT_PIECES, VAULT_CODE, VAULT_CRACK_POINTS } from '@/data/gameContent';

export default function VaultGame() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [mounted, setMounted] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [cracked, setCracked] = useState(false);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none');

  useEffect(() => {
    const p = getPlayer();
    if (!p) { router.push('/join'); return; }
    setPlayer(p);
    setMounted(true);
  }, [router]);

  if (!mounted || !player) return null;

  const collectedPieces = VAULT_PIECES.filter(vp => player.vaultPieces.includes(vp.piece));
  const allPiecesCollected = collectedPieces.length === VAULT_PIECES.length;

  const handleSubmit = () => {
    if (codeInput.trim() === VAULT_CODE) {
      setCracked(true);
      setFeedback('correct');
      addScore('vault', VAULT_CRACK_POINTS);
      addBadge('🔐');
      setPlayer(getPlayer());
    } else {
      setFeedback('wrong');
      setTimeout(() => setFeedback('none'), 1000);
    }
  };

  // Assemble the code hint from collected pieces
  const codeHint = VAULT_PIECES.map(vp => 
    player.vaultPieces.includes(vp.piece) ? vp.piece : '_'
  ).join(' ');

  return (
    <main className="min-h-screen bg-brand-black text-brand-cream p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => router.push('/games')} className="font-display font-bold text-sm uppercase hover:text-brand-acid">
            ← BACK
          </button>
          <h1 className="font-display font-black text-3xl uppercase italic">🔐 THE VAULT</h1>
          <div className="font-display font-black text-xl">{player.avatar}</div>
        </div>

        {/* Vault visual */}
        <div className="mb-8 text-center">
          <div className={`text-8xl mb-4 transition-all ${cracked ? 'scale-125' : ''} ${!allPiecesCollected && !cracked ? 'opacity-30' : ''}`}>
            {cracked ? '🔓' : '🔐'}
          </div>
          <div className="font-display font-black text-2xl uppercase italic">
            {cracked ? 'VAULT CRACKED!' : allPiecesCollected ? 'ENTER THE CODE' : 'COLLECT ALL PIECES'}
          </div>
        </div>

        {/* Code pieces display */}
        <div className="mb-8 p-6 poster-border bg-brand-cream/5 border-brand-cream/20">
          <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-acid mb-4 text-center">
            CODE PIECES
          </div>
          <div className="grid grid-cols-4 gap-3">
            {VAULT_PIECES.map(vp => {
              const collected = player.vaultPieces.includes(vp.piece);
              return (
                <div
                  key={vp.id}
                  className={`p-4 border-4 text-center transition-all ${
                    collected
                      ? 'bg-brand-acid text-brand-black border-brand-acid'
                      : 'border-brand-cream/20 text-brand-cream/30'
                  }`}
                >
                  <div className="font-display font-black text-3xl">
                    {collected ? vp.piece : '?'}
                  </div>
                  <div className="font-display font-bold text-[10px] uppercase tracking-widest mt-1">
                    {collected ? vp.game : 'LOCKED'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hint for assembling code */}
          {collectedPieces.length > 0 && collectedPieces.length < VAULT_PIECES.length && (
            <div className="mt-4 text-center">
              <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-cream/40 mb-1">
                PARTIAL CODE
              </div>
              <div className="font-display font-black text-2xl tracking-[0.5em] text-brand-acid">
                {codeHint}
              </div>
            </div>
          )}
        </div>

        {/* Missing pieces hints */}
        {!allPiecesCollected && !cracked && (
          <div className="mb-8 space-y-3">
            {VAULT_PIECES.filter(vp => !player.vaultPieces.includes(vp.piece)).map(vp => (
              <div key={vp.id} className="p-3 border-2 border-brand-cream/10 flex items-center gap-3">
                <div className="text-2xl">🔒</div>
                <div>
                  <div className="font-display font-bold text-sm uppercase">{vp.game}</div>
                  <div className="font-body text-sm opacity-60">{vp.hint}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Code input — only when all pieces collected */}
        {allPiecesCollected && !cracked && (
          <div className={`p-8 poster-border poster-shadow mb-6 transition-colors ${
            feedback === 'correct' ? 'bg-brand-acid text-brand-black' :
            feedback === 'wrong' ? 'bg-brand-coral text-brand-black' : 'bg-brand-purple'
          }`}>
            <div className="font-display font-bold text-xs uppercase tracking-widest opacity-60 mb-2 text-center">
              ENTER THE 4-DIGIT CODE
            </div>
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="_ _ _ _"
              maxLength={4}
              className="w-full px-4 py-6 border-4 border-brand-cream font-display font-black text-5xl uppercase text-center tracking-[0.3em] text-brand-cream bg-transparent focus:outline-none focus:bg-brand-cream/10"
            />
            <button
              onClick={handleSubmit}
              disabled={codeInput.length !== 4}
              className="w-full mt-4 py-4 bg-brand-acid text-brand-black font-display font-black uppercase text-xl poster-border hover:-translate-y-1 transition-transform disabled:opacity-30"
            >
              CRACK THE VAULT →
            </button>
          </div>
        )}

        {/* Feedback */}
        {feedback === 'wrong' && (
          <div className="text-center font-display font-black text-2xl uppercase text-brand-coral animate-pulse">
            ✗ WRONG CODE. TRY AGAIN!
          </div>
        )}

        {/* Cracked screen */}
        {cracked && (
          <div className="p-8 poster-border poster-shadow bg-brand-acid text-brand-black text-center">
            <div className="text-6xl mb-4">🔓</div>
            <h2 className="font-display font-black text-4xl uppercase italic mb-2">VAULT CRACKED!</h2>
            <p className="font-body text-xl mb-4">You earned +{VAULT_CRACK_POINTS} points!</p>
            <div className="font-display font-black text-lg uppercase bg-brand-black text-brand-acid p-2 mb-4">
              BADGE EARNED: 🔐
            </div>
            <button onClick={() => router.push('/games')} className="px-8 py-4 bg-brand-purple text-brand-cream font-display font-black uppercase poster-border poster-shadow hover:-translate-y-1 transition-transform">
              BACK TO HUB →
            </button>
          </div>
        )}
      </div>
    </main>
  );
}