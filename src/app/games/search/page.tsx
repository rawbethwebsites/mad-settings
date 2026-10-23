'use client';

import GameShell from '@/components/arcade/GameShell';
import { RaceOnline } from '@/components/games/RaceOnline';
import SearchSolo from '@/components/games/SearchSolo';

export default function Page() {
  return (
    <GameShell id="search" title="SEARCH" emoji="🔍"
      online={{ render: p => <RaceOnline {...p} /> }}>
      {() => <SearchSolo />}
    </GameShell>
  );
}
