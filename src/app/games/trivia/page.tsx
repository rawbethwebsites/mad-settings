'use client';

import GameShell from '@/components/arcade/GameShell';
import Trivia from '@/components/games/Trivia';
import { TriviaOnline } from '@/components/games/TriviaOnline';

export default function Page() {
  return (
    <GameShell id="trivia" title="NAIJA TRIVIA" emoji="🇳🇬"
      online={{ render: p => <TriviaOnline {...p} /> }}>
      {({ award }) => <Trivia award={award} />}
    </GameShell>
  );
}
