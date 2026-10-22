'use client';

import GameShell from '@/components/arcade/GameShell';
import { RaceOnline } from '@/components/games/RaceOnline';
import PuzzlesSolo from '@/components/games/PuzzlesSolo';

export default function Page() {
  return (
    <GameShell id="puzzles" title="PUZZLES" emoji="🧩"
      online={{ render: p => <RaceOnline {...p} /> }}>
      {() => <PuzzlesSolo />}
    </GameShell>
  );
}
