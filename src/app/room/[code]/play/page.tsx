'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { camperId } from '@/lib/camper';
import { BingoPlayer, TriviaPlayer } from '@/components/room/rounds';

// The live group round the host started (Trivia or Bingo)
export default function RoomPlayPage() {
  const { code: raw } = useParams<{ code: string }>();
  const code = (raw ?? '').toUpperCase();
  const [playerId] = useState<string | null>(() => (typeof window === 'undefined' ? null : camperId()));
  const room = useQuery(api.rooms.get, playerId ? { code, playerId } : 'skip');

  return (
    <main className="min-h-screen bg-brand-cream text-brand-black p-4 md:p-6">
      <div className="max-w-xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href={`/room/${code}`} className="font-display font-bold text-sm uppercase hover:text-brand-purple">
            ← ROOM {code}
          </Link>
        </div>
        {room?.round?.game === 'trivia' && <TriviaPlayer roundId={room.round.id} />}
        {room?.round?.game === 'bingo' && <BingoPlayer roundId={room.round.id} />}
        {room && !room.round && (
          <div className="p-8 poster-border poster-shadow bg-white text-center">
            <div className="text-6xl mb-4 animate-pulse">🔥</div>
            <h1 className="font-display font-black text-3xl uppercase italic mb-2">No round right now</h1>
            <p className="font-body text-lg text-brand-black/60">When the host starts Trivia or Bingo it shows up here.</p>
          </div>
        )}
      </div>
    </main>
  );
}
