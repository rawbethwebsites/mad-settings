'use client';

import GameShell from '@/components/arcade/GameShell';
import Whot from '@/components/games/Whot';

export default function Page() {
  return (
    <GameShell id="whot" title="WHOT!" emoji="🃏">
      {({ award }) => <Whot award={award} />}
    </GameShell>
  );
}
