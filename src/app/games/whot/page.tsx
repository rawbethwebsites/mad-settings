'use client';

import GameShell from '@/components/arcade/GameShell';
import Whot, { WhotOnline } from '@/components/games/Whot';

export default function Page() {
  return (
    <GameShell
      id="whot"
      title="WHOT!"
      emoji="🃏"
      online={{ render: p => <WhotOnline {...p} /> }}
    >
      {({ award }) => <Whot award={award} />}
    </GameShell>
  );
}
