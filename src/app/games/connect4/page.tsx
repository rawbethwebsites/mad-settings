'use client';

import GameShell from '@/components/arcade/GameShell';
import Connect4, { Connect4Online } from '@/components/games/Connect4';

export default function Page() {
  return (
    <GameShell
      id="connect4"
      title="CONNECT 4"
      emoji="🔴"
      online={{ render: p => <Connect4Online {...p} /> }}
    >
      {({ award }) => <Connect4 award={award} />}
    </GameShell>
  );
}
