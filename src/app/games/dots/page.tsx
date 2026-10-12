'use client';

import GameShell from '@/components/arcade/GameShell';
import DotsAndBoxes from '@/components/games/DotsAndBoxes';

export default function Page() {
  return (
    <GameShell id="dots" title="DOTS & BOXES" emoji="🔲">
      {({ award }) => <DotsAndBoxes award={award} />}
    </GameShell>
  );
}
