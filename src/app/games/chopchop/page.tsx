'use client';

import GameShell from '@/components/arcade/GameShell';
import ChopChop from '@/components/games/ChopChop';
import { RaceOnline } from '@/components/games/RaceOnline';

export default function Page() {
  return (
    <GameShell id="chopchop" title="CHOP CHOP" emoji="🍢"
      online={{ render: p => <RaceOnline {...p} /> }}>
      {({ award }) => <ChopChop award={award} />}
    </GameShell>
  );
}
