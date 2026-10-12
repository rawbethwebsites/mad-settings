'use client';

import GameShell from '@/components/arcade/GameShell';
import Minesweeper from '@/components/games/Minesweeper';

export default function Page() {
  return (
    <GameShell id="minesweeper" title="MINESWEEPER" emoji="💣">
      {({ award }) => <Minesweeper award={award} />}
    </GameShell>
  );
}
