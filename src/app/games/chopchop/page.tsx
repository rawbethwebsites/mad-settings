'use client';

import GameShell from '@/components/arcade/GameShell';
import ChopChop from '@/components/games/ChopChop';

export default function Page() {
  return (
    <GameShell id="chopchop" title="CHOP CHOP" emoji="🍢">
      {({ award }) => <ChopChop award={award} />}
    </GameShell>
  );
}
