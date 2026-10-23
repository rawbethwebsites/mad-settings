'use client';

import GameShell from '@/components/arcade/GameShell';
import { SameOnline } from '@/components/games/SameOnline';
import SameSolo from '@/components/games/SameSolo';

export default function Page() {
  return (
    <GameShell id="same" title="DON'T SAY THE SAME THING" emoji="🤐"
      online={{ render: p => <SameOnline {...p} /> }}>
      {() => <SameSolo />}
    </GameShell>
  );
}
