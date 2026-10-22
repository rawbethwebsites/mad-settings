'use client';

import GameShell from '@/components/arcade/GameShell';
import { RaceOnline } from '@/components/games/RaceOnline';
import VaultSolo from '@/components/games/VaultSolo';

export default function Page() {
  return (
    <GameShell id="vault" title="VAULT" emoji="🔐"
      online={{ render: p => <RaceOnline {...p} /> }}>
      {() => <VaultSolo />}
    </GameShell>
  );
}
