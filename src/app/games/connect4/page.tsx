'use client';

import GameShell from '@/components/arcade/GameShell';
import Connect4 from '@/components/games/Connect4';

export default function Page() {
  return (
    <GameShell id="connect4" title="CONNECT 4" emoji="🔴">
      {({ award }) => <Connect4 award={award} />}
    </GameShell>
  );
}
