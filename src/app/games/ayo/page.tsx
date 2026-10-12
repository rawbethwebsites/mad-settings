'use client';

import GameShell from '@/components/arcade/GameShell';
import Ayo from '@/components/games/Ayo';

export default function Page() {
  return (
    <GameShell id="ayo" title="AYO" emoji="🌰">
      {({ award }) => <Ayo award={award} />}
    </GameShell>
  );
}
