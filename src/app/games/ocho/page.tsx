'use client';

import GameShell from '@/components/arcade/GameShell';
import Ocho from '@/components/games/Ocho';

export default function Page() {
  return (
    <GameShell id="ocho" title="OCHO!" emoji="🎴">
      {({ award }) => <Ocho award={award} />}
    </GameShell>
  );
}
