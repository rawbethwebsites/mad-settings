'use client';

import GameShell from '@/components/arcade/GameShell';
import TenTen from '@/components/games/TenTen';

export default function Page() {
  return (
    <GameShell id="tenten" title="TEN TEN" emoji="👆">
      {({ award }) => <TenTen award={award} />}
    </GameShell>
  );
}
