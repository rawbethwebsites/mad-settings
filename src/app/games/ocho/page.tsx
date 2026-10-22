'use client';

import GameShell from '@/components/arcade/GameShell';
import Ocho, { OchoOnline } from '@/components/games/Ocho';

export default function Page() {
  return (
    <GameShell
      id="ocho"
      title="OCHO!"
      emoji="🎴"
      online={{ render: p => <OchoOnline {...p} /> }}
    >
      {({ award }) => <Ocho award={award} />}
    </GameShell>
  );
}
