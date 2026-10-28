'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { camperId } from '@/lib/camper';
import { naira, serverMessage } from '@/lib/account';

// Games campers can play each other for chips (all run through rooms online)
const CHIP_GAMES = [
  { id: 'whot', name: 'Whot!', emoji: '🃏' },
  { id: 'ludo', name: 'Ludo', emoji: '🎲' },
  { id: 'ayo', name: 'Ayo', emoji: '🌰' },
  { id: 'ocho', name: 'Ocho!', emoji: '🎴' },
  { id: 'connect4', name: 'Connect 4', emoji: '🔴' },
  { id: 'tictactoe', name: 'Tic Tac Toe', emoji: '⭕' },
  { id: 'dots', name: 'Dots & Boxes', emoji: '🔲' },
  { id: 'trivia', name: 'Naija Trivia', emoji: '🇳🇬' },
  { id: 'chopchop', name: 'Chop Chop', emoji: '🍢' },
  { id: 'tenten', name: 'Ten Ten', emoji: '👆' },
];

const gold = 'text-[#f5d76e]';
const felt = 'bg-[#0f3d2e]';
const rim = 'border-4 border-[#d4a017]';

function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className={`${rim} ${felt} p-4 mb-5 shadow-[6px_6px_0_#000]`}>
      {title && <h2 className={`font-display font-black text-lg uppercase mb-3 ${gold}`}>{title}</h2>}
      {children}
    </section>
  );
}

export default function CasinoPage() {
  const [key, setKey] = useState('');
  useEffect(() => { const t = setTimeout(() => setKey(camperId()), 0); return () => clearTimeout(t); }, []);
  const data = useQuery(api.casino.lobby, key ? { playerKey: key } : 'skip');
  const buy = useMutation(api.casino.buyChips);
  const confirmAdult = useMutation(api.casino.confirmAdult);
  const [busy, setBusy] = useState(0);
  const [note, setNote] = useState('');
  const [ticked, setTicked] = useState(false);

  const me = data?.me;
  const approved = me?.status === 'approved';

  return (
    <main className="min-h-screen bg-[#082a1f] text-[#f3efe2] p-4 md:p-6">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between gap-2 mb-4">
          <Link href="/games" className="min-h-11 flex items-center font-display font-bold text-sm uppercase">← Games</Link>
          <h1 className={`font-display font-black text-2xl uppercase italic ${gold}`}>🎰 Casino</h1>
          <span className="w-14" />
        </div>

        {data === undefined ? <p role="status">Loading the casino…</p> : (
          <>
            {/* Chip balance */}
            <div className={`${rim} bg-black p-5 mb-5 text-center shadow-[6px_6px_0_#000]`}>
              <div className="font-display font-bold text-xs uppercase tracking-widest opacity-60">Your chips</div>
              <div className={`font-display font-black text-5xl ${gold}`} data-chips>{(me?.chips ?? 0).toLocaleString()}</div>
              {me?.founderNo && (
                <div className="inline-block mt-2 px-3 py-1 bg-[#d4a017] text-black font-display font-black text-sm uppercase">
                  ★ Founding Camper #{me.founderNo}
                </div>
              )}
              {approved && <div className="mt-2 font-body text-sm opacity-70">Wallet: {naira(me.balance)}</div>}
            </div>

            {!me?.founderNo && data.foundersLeft > 0 && (
              <Panel>
                <p className="font-display font-black uppercase">
                  ★ Founding spots left: <span className={gold}>{data.foundersLeft}</span>
                </p>
                <p className="font-body text-sm opacity-80 mt-1">
                  The first {data.founders} campers to sign up get {data.founderChips.toLocaleString()} free chips and a gold Founding Camper badge.
                </p>
              </Panel>
            )}

            {!me ? (
              <Panel title="Sign up to play for chips">
                <p className="font-body mb-3">You need a camp account to buy chips.</p>
                <Link href="/account" className={`inline-block px-4 py-3 bg-[#d4a017] text-black font-display font-black uppercase`}>Sign up / Log in →</Link>
              </Panel>
            ) : !approved ? (
              <Panel title="Almost there">
                <p className="font-body">Your camp account is on hold. Ask camp staff about it.</p>
              </Panel>
            ) : data.paused ? (
              <Panel title="Casino paused">
                <p className="font-body">Camp staff have paused chip games for now. Check back soon.</p>
              </Panel>
            ) : !me.adult ? (
              <Panel title="18+ only">
                <label className="flex items-start gap-3 font-body mb-3">
                  <input type="checkbox" className="mt-1 size-5" checked={ticked} onChange={e => setTicked(e.target.checked)} />
                  I&apos;m 18 or older. I understand chips are for fun: they can&apos;t be cashed out or swapped for prizes.
                </label>
                <button
                  disabled={!ticked}
                  onClick={() => confirmAdult({ playerKey: key }).catch(e => setNote(serverMessage(e)))}
                  className="px-4 py-3 bg-[#d4a017] text-black font-display font-black uppercase disabled:opacity-40"
                >
                  Enter the casino →
                </button>
              </Panel>
            ) : (
              <Panel title="Buy chips">
                <div className="grid grid-cols-2 gap-3">
                  {data.packs.map(p => (
                    <button
                      key={p.naira}
                      disabled={!!busy || me.balance < p.naira}
                      onClick={() => {
                        setBusy(p.naira); setNote('');
                        buy({ playerKey: key, naira: p.naira })
                          .then(r => setNote(`Done! You now have ${r.chips.toLocaleString()} chips.`))
                          .catch(e => setNote(serverMessage(e)))
                          .finally(() => setBusy(0));
                      }}
                      className="p-3 border-4 border-[#d4a017]/60 bg-black/40 text-left disabled:opacity-40"
                    >
                      <div className={`font-display font-black text-2xl ${gold}`}>{p.chips.toLocaleString()}</div>
                      <div className="font-display font-bold text-xs uppercase">chips · {naira(p.naira)}</div>
                      {p.chips > p.naira && <div className="font-body text-xs text-[#9be38a]">+{(p.chips - p.naira).toLocaleString()} bonus</div>}
                    </button>
                  ))}
                </div>
                {note && <p role="status" className="mt-3 p-2 bg-black/40 font-body text-sm">{note}</p>}
                <p className="font-body text-xs opacity-70 mt-3">
                  Paid from your wallet. Up to {naira(data.dailyLimit)} of chips a day ({naira(Math.max(0, data.dailyLimit - me.boughtToday))} left today).{' '}
                  {me.balance < data.packs[0].naira && <Link href="/account" className="underline">Top up your wallet →</Link>}
                </p>
              </Panel>
            )}

            <Panel title="Play for chips">
              <p className="font-body text-sm opacity-80 mb-3">
                Open a game, tap <b>Play a friend</b>, pick your stake and invite. Everyone puts in the same chips. The winner takes the pot, and the camp keeps {data.houseCut}%.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {CHIP_GAMES.map(g => (
                  <Link key={g.id} href={`/games/${g.id}`} className="min-h-12 flex items-center gap-2 px-3 bg-black/40 border-2 border-[#d4a017]/40 font-display font-black uppercase text-sm">
                    <span aria-hidden="true">{g.emoji}</span>{g.name}
                  </Link>
                ))}
              </div>
            </Panel>

            <Panel title="Top chip holders">
              {data.leaderboard.length === 0 ? <p className="font-body opacity-70">No chips in play yet. Be the first.</p> : (
                <ol className="space-y-1">
                  {data.leaderboard.map((r, i) => (
                    <li key={i} className={`flex items-center justify-between gap-2 px-2 py-1 ${r.me ? 'bg-[#d4a017]/20' : ''}`}>
                      <span className="font-display font-black">{i === 0 ? '👑' : `${i + 1}.`} {r.name}{r.founderNo ? <span className={`ml-1 text-xs ${gold}`}>★#{r.founderNo}</span> : null}</span>
                      <span className={`font-display font-black ${gold}`}>{r.chips.toLocaleString()}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>

            {me && me.history.length > 0 && (
              <Panel title="Your chip history">
                <ul className="space-y-1 font-body text-sm">
                  {me.history.map(h => (
                    <li key={h.id} className="flex justify-between gap-2">
                      <span className="truncate">{h.label}</span>
                      <span className={h.amount > 0 ? 'text-[#9be38a]' : 'text-[#ff9b9b]'}>{h.amount > 0 ? '+' : ''}{h.amount.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            <p className="font-body text-xs opacity-60 text-center mb-8">
              Chips are for fun at camp. They can&apos;t be cashed out, refunded as money or swapped for prizes.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
