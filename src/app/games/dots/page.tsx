'use client';

import GameShell from '@/components/arcade/GameShell';
import DotsAndBoxes, { DotsOnline } from '@/components/games/DotsAndBoxes';

export default function Page() {
  return (
    <GameShell
      id="dots"
      title="DOTS & BOXES"
      emoji="🔲"
      online={{ render: p => <DotsOnline {...p} /> }}
    >
      {({ award }) => <DotsAndBoxes award={award} />}
    </GameShell>
  );
}
