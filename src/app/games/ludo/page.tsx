'use client';

import GameShell from '@/components/arcade/GameShell';
import Ludo, { LudoOnline } from '@/components/games/Ludo';

export default function Page() {
  return (
    <GameShell id="ludo" title="LUDO" emoji="🎲" online={{ render: p => <LudoOnline {...p} /> }}>
      {({ award }) => <Ludo award={award} />}
    </GameShell>
  );
}
