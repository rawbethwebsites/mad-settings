'use client';

import GameShell from '@/components/arcade/GameShell';
import Ayo, { AyoOnline } from '@/components/games/Ayo';

export default function Page() {
  return (
    <GameShell
      id="ayo"
      title="AYO"
      emoji="🌰"
      online={{ render: p => <AyoOnline {...p} /> }}
    >
      {({ award }) => <Ayo award={award} />}
    </GameShell>
  );
}
