'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { addScore, getPlayer, type Player } from '@/lib/player';

export interface ShellApi {
  player: Player;
  /** Adds points to this game's slot on the camper's scorecard */
  award: (points: number) => void;
}

export default function GameShell({
  id,
  title,
  emoji,
  children,
}: {
  id: string;
  title: string;
  emoji: string;
  children: (api: ShellApi) => ReactNode;
}) {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);

  useEffect(() => {
    const p = getPlayer();
    if (!p) { router.push('/join'); return; }
    const t = window.setTimeout(() => setPlayer(p), 0);
    return () => window.clearTimeout(t);
  }, [router]);

  if (!player) return null;

  const award = (points: number) => {
    if (points > 0) addScore(id, points);
  };

  return (
    <main className="min-h-screen bg-brand-cream text-brand-black p-4 md:p-6">
      <div className="max-w-xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => router.push('/games')} className="font-display font-bold text-sm uppercase hover:text-brand-purple">
            ← BACK
          </button>
          <h1 className="font-display font-black text-2xl md:text-3xl uppercase italic">
            {emoji} {title}
          </h1>
          <div className="font-display font-black text-xl">{player.avatar}</div>
        </div>
        {children({ player, award })}
      </div>
    </main>
  );
}
