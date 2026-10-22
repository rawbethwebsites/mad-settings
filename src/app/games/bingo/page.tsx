'use client';

import GameShell from '@/components/arcade/GameShell';
import { RaceOnline } from '@/components/games/RaceOnline';
import BingoSolo from '@/components/games/BingoSolo';

export default function Page() {
  return (
    <GameShell id="bingo" title="BINGO" emoji="🎯"
      online={{ render: p => <RaceOnline {...p} /> }}>
      {() => <BingoSolo />}
    </GameShell>
  );
}
