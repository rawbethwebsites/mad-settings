'use client';

// Shared chip controls for games played against other campers
import type { useQuery } from 'convex/react';
import type { api } from '../../../convex/_generated/api';

type Casino = ReturnType<typeof useQuery<typeof api.casino.lobby>>;

// Play for fun, or put chips on it. Only campers with an approved account see the chips.
export function StakePicker({ casino, stake, setStake }: { casino: Casino; stake: number; setStake: (n: number) => void }) {
  const me = casino?.me;
  if (!casino || !me || me.status !== 'approved') return null;
  if (casino.paused) return <p className="font-body text-sm text-brand-black/60 mb-4">🎰 Chip games are paused right now.</p>;
  if (!me.adult || me.chips < casino.stakes[0]) {
    return (
      <a href="/casino" className="block mb-4 p-3 border-4 border-[#d4a017] bg-[#0f3d2e] text-[#f5d76e] font-display font-black uppercase text-sm">
        🎰 Play for chips? Get chips in the Casino →
      </a>
    );
  }
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2 font-display font-bold text-xs uppercase tracking-widest">
        <span>🎰 Play for chips?</span>
        <span>You have {me.chips.toLocaleString()}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {[0, ...casino.stakes].map(n => (
          <button
            key={n}
            type="button"
            aria-pressed={stake === n}
            disabled={n > me.chips}
            onClick={() => setStake(n)}
            className={`min-h-11 px-3 border-4 font-display font-black text-sm disabled:opacity-30 ${
              stake === n ? 'border-[#d4a017] bg-[#0f3d2e] text-[#f5d76e]' : 'border-brand-black/15 bg-white'
            }`}
          >
            {n ? n.toLocaleString() : 'Free'}
          </button>
        ))}
      </div>
      {stake > 0 && (
        <p className="font-body text-xs text-brand-black/60 mt-2">
          Everyone puts in {stake.toLocaleString()}. Winner takes the pot, minus the camp&apos;s {casino.houseCut}%.
        </p>
      )}
    </div>
  );
}

export function ChipBanner({ stake, pot }: { stake: number; pot: number }) {
  if (!stake) return null;
  return (
    <div data-chip-pot className="flex items-center justify-between gap-2 mb-2 px-3 py-2 border-4 border-[#d4a017] bg-[#0f3d2e] text-[#f5d76e] font-display font-black uppercase text-sm">
      <span>🎰 {stake.toLocaleString()} each</span>
      <span>Pot {pot.toLocaleString()}</span>
    </div>
  );
}
