'use client';

import GameShell from '@/components/arcade/GameShell';
import TenTen, { TenTenOnline } from '@/components/games/TenTen';

export default function Page() {
  return (
    <GameShell id="tenten" title="TEN TEN" emoji="👆"
      online={{ render: p => <TenTenOnline {...p} /> }}>
      {({ award }) => <TenTen award={award} />}
    </GameShell>
  );
}
