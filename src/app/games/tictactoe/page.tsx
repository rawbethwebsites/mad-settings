'use client';

import GameShell from '@/components/arcade/GameShell';
import EndlessTicTacToe from '@/components/games/EndlessTicTacToe';

export default function Page() {
  return (
    <GameShell id="tictactoe" title="ENDLESS TIC TAC TOE" emoji="⭕">
      {({ award }) => <EndlessTicTacToe award={award} />}
    </GameShell>
  );
}
