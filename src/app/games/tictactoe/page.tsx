'use client';

import GameShell from '@/components/arcade/GameShell';
import EndlessTicTacToe, { TicTacToeOnline } from '@/components/games/EndlessTicTacToe';

export default function Page() {
  return (
    <GameShell
      id="tictactoe"
      title="ENDLESS TIC TAC TOE"
      emoji="⭕"
      online={{ render: p => <TicTacToeOnline {...p} /> }}
    >
      {({ award }) => <EndlessTicTacToe award={award} />}
    </GameShell>
  );
}
