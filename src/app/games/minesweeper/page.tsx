'use client';

import GameShell from '@/components/arcade/GameShell';
import Minesweeper from '@/components/games/Minesweeper';
import { RaceOnline } from '@/components/games/RaceOnline';

export default function Page() {
  return (
    <GameShell id="minesweeper" title="MINESWEEPER" emoji="💣"
      online={{ render: p => <RaceOnline {...p} /> }}>
      {({ award }) => <Minesweeper award={award} />}
    </GameShell>
  );
}
