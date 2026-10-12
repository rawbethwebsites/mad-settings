'use client';

import GameShell from '@/components/arcade/GameShell';
import Trivia from '@/components/games/Trivia';

export default function Page() {
  return (
    <GameShell id="trivia" title="NAIJA TRIVIA" emoji="🇳🇬">
      {({ award }) => <Trivia award={award} />}
    </GameShell>
  );
}
