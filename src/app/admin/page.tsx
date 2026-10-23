'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useAction, useMutation, useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { camperId } from '@/lib/camper';
import { naira, serverMessage } from '@/lib/account';

type Overview = NonNullable<FunctionReturnType<typeof api.walletAdmin.overview>>;
const TABS = ['Payments', 'Campers', 'Prices', 'Shop', 'Settings'] as const;
const GAMES = ['ludo', 'whot', 'ocho', 'ayo', 'connect4', 'tictactoe', 'dots', 'chopchop', 'minesweeper', 'tenten', 'trivia', 'bingo', 'search', 'puzzles', 'same', 'vault'];
const input = 'p-2 border-[3px] border-brand-black bg-white font-body';
const btn = 'px-3 py-2 poster-border font-display font-black uppercase text-sm disabled:opacity-40';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="p-4 poster-border poster-shadow bg-white mb-5"><h2 className="font-display font-black text-lg uppercase mb-3">{title}</h2>{children}</section>;
}

export default function AdminPage() {
  const [me, setMe] = useState('');
  useEffect(() => { const t = setTimeout(() => setMe(camperId()), 0); return () => clearTimeout(t); }, []);
  const data = useQuery(api.walletAdmin.overview, me ? { playerId: me } : 'skip');
  const [tab, setTab] = useState<(typeof TABS)[number]>('Payments');
  const [flash, setFlash] = useState('');
  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setFlash('');
    try { await fn(); if (ok) setFlash(ok); } catch (e) { setFlash(serverMessage(e)); }
  };

  return (
    <main className="min-h-screen bg-brand-cream text-brand-black p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Link href="/account" className="min-h-11 flex items-center font-display font-bold text-sm uppercase">← My camp</Link>
          <h1 className="font-display font-black text-2xl uppercase italic">Camp admin</h1>
          <span className="w-16" />
        </div>
        {data === undefined ? null : data === null ? (
          <Section title="Staff only">
            <p className="font-body">This page is for camp staff. Log in with a staff account, or ask the Head Ranger to make you a Cashier.</p>
          </Section>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              {TABS.filter(t => t !== 'Settings' || data.role === 'head').map(t => (
                <button key={t} type="button" onClick={() => { setTab(t); setFlash(''); }}
                  className={`${btn} shrink-0 ${tab === t ? 'bg-brand-purple text-brand-cream' : 'bg-white'}`}>
                  {t}{t === 'Payments' && data.pending.length ? ` (${data.pending.length})` : ''}{t === 'Shop' && data.orders.length ? ` (${data.orders.length})` : ''}
                </button>
              ))}
            </div>
            {flash && <p role="status" className="p-3 mb-4 poster-border bg-brand-acid font-body">{flash}</p>}
            {tab === 'Payments' && <Payments data={data} me={me} run={run} />}
            {tab === 'Campers' && <Campers data={data} me={me} run={run} />}
            {tab === 'Prices' && <Prices data={data} me={me} run={run} />}
            {tab === 'Shop' && <Shop data={data} me={me} run={run} />}
            {tab === 'Settings' && <Settings data={data} me={me} run={run} />}
          </>
        )}
      </div>
    </main>
  );
}

type TabProps = { data: Overview; me: string; run: (fn: () => Promise<unknown>, ok?: string) => Promise<void> };

function Payments({ data, me, run }: TabProps) {
  const review = useMutation(api.walletAdmin.review);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  return (
    <>
      <Section title={`Receipts to check (${data.pending.length})`}>
        <p className="font-body text-sm mb-3 p-2 bg-brand-acid">Open your bank app and make sure the money really landed before you approve. Screenshots can be faked.</p>
        {!data.pending.length && <p className="font-body">Nothing waiting. New receipts appear here by themselves.</p>}
        <div className="space-y-4">
          {data.pending.map(p => (
            <article key={p.id} className="p-3 border-[3px] border-brand-black">
              <div className="flex justify-between gap-2 flex-wrap">
                <div>
                  <div className="font-display font-black uppercase">{p.camper?.name ?? 'Unknown'} · {p.kind === 'registration' ? 'Camp fee' : 'Wallet top-up'}</div>
                  <div className="font-body text-sm">{p.camper?.phone} · sent {new Date(p.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                </div>
                <div className="font-display font-black text-2xl">{naira(p.amount)}</div>
              </div>
              {p.proofUrl && (
                <a href={p.proofUrl} target="_blank" rel="noreferrer" className="block mt-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.proofUrl} alt={`Receipt from ${p.camper?.name ?? 'camper'}`} className="max-h-80 w-auto mx-auto border-2 border-brand-black" />
                  <span className="block text-center font-body text-xs underline mt-1">Open full size</span>
                </a>
              )}
              <div className="flex flex-wrap items-end gap-2 mt-3">
                <label className="font-body text-sm">Amount that landed (₦)
                  <input className={`${input} block w-32`} inputMode="numeric" value={amounts[p.id] ?? String(p.amount)} onChange={e => setAmounts({ ...amounts, [p.id]: e.target.value })} />
                </label>
                <button type="button" className={`${btn} bg-brand-acid`} onClick={() => run(() => review({ playerId: me, paymentId: p.id, approve: true, amount: Number((amounts[p.id] ?? String(p.amount)).replace(/\D/g, '')) }), `Approved ${p.camper?.name}.`)}>Approve ✓</button>
                <button type="button" className={`${btn} bg-brand-coral`} onClick={() => { const note = prompt('Why are you rejecting it? The camper will see this.'); if (note === null) return; void run(() => review({ playerId: me, paymentId: p.id, approve: false, note }), 'Rejected.'); }}>Reject</button>
              </div>
            </article>
          ))}
        </div>
      </Section>
      {!!data.recent.length && (
        <Section title="Recently approved">
          <ul className="font-body text-sm space-y-1">{data.recent.map(r => <li key={r.id}>{r.camper?.name} · {r.kind === 'registration' ? 'camp fee' : 'top-up'} · {naira(r.amount)} · by {r.reviewer}</li>)}</ul>
        </Section>
      )}
    </>
  );
}

function Campers({ data, me, run }: TabProps) {
  const [q, setQ] = useState('');
  const campers = useQuery(api.walletAdmin.findCampers, { playerId: me, q });
  const adjust = useMutation(api.walletAdmin.adjust);
  const setStatus = useMutation(api.walletAdmin.setAccountStatus);
  const setCashier = useMutation(api.walletAdmin.setCashier);
  const reset = useAction(api.walletAdmin.resetPassword);
  return (
    <Section title="Campers">
      <input className={`${input} w-full mb-3`} placeholder="Search name or phone" value={q} onChange={e => setQ(e.target.value)} />
      <div className="space-y-3">
        {campers?.map(c => (
          <article key={c.id} className="p-3 border-[3px] border-brand-black">
            <div className="flex justify-between gap-2 flex-wrap">
              <div>
                <div className="font-display font-black uppercase">{c.name}{c.cashier ? ' · Cashier' : ''}</div>
                <div className="font-body text-sm">{c.phone} · {c.status === 'approved' ? 'paid ✓' : c.status}</div>
              </div>
              <div className="font-display font-black text-xl">{naira(c.balance)}</div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button type="button" className={`${btn} bg-white`} onClick={() => { const v = prompt(`Add money to ${c.name}'s wallet (use - to take away), in naira:`); if (!v) return; const reason = prompt('Reason (for the record):') ?? ''; void run(() => adjust({ playerId: me, accountId: c.id, amount: Number(v.replace(/[^\d-]/g, '')), reason }), 'Wallet updated.'); }}>± Money</button>
              {c.status !== 'approved' && <button type="button" className={`${btn} bg-brand-acid`} onClick={() => run(() => setStatus({ playerId: me, accountId: c.id, status: 'approved' }), `${c.name} marked as paid.`)}>Mark paid</button>}
              <button type="button" className={`${btn} bg-white`} onClick={() => { if (confirm(`Reset ${c.name}'s password?`)) void run(async () => { const temp = await reset({ playerId: me, accountId: c.id }); alert(`New password for ${c.name}: ${temp}\nTell them to change it after logging in.`); }); }}>Reset password</button>
              {data.role === 'head' && <button type="button" className={`${btn} bg-white`} onClick={() => run(() => setCashier({ playerId: me, accountId: c.id, on: !c.cashier }), c.cashier ? 'Cashier removed.' : `${c.name} is now a Cashier.`)}>{c.cashier ? 'Remove cashier' : 'Make cashier'}</button>}
            </div>
          </article>
        ))}
        {campers?.length === 0 && <p className="font-body">No campers found.</p>}
      </div>
    </Section>
  );
}

function Prices({ data, me, run }: TabProps) {
  const setPrice = useMutation(api.walletAdmin.setPrice);
  const current = Object.fromEntries(data.prices.map(p => [p.game, p.price]));
  const [edit, setEdit] = useState<Record<string, string>>({});
  return (
    <Section title="Game prices">
      <p className="font-body text-sm mb-3">0 = free. A price is paid once per visit to that game (online games: when you sit down; refunded if the game never starts).</p>
      <div className="space-y-2">
        {GAMES.map(g => (
          <div key={g} className="flex items-center gap-2">
            <span className="flex-1 font-display font-black uppercase">{g}</span>
            <span className="font-body">₦</span>
            <input className={`${input} w-24`} inputMode="numeric" value={edit[g] ?? String(current[g] ?? 0)} onChange={e => setEdit({ ...edit, [g]: e.target.value })} />
            <button type="button" className={`${btn} bg-brand-acid`} onClick={() => run(() => setPrice({ playerId: me, game: g, price: Number((edit[g] ?? '0').replace(/\D/g, '')) }), `${g} price saved.`)}>Save</button>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Shop({ data, me, run }: TabProps) {
  const save = useMutation(api.walletAdmin.saveShopItem);
  const done = useMutation(api.walletAdmin.orderDone);
  const [item, setItem] = useState({ name: '', emoji: '🥤', price: '' });
  return (
    <>
      <Section title={`Orders to hand over (${data.orders.length})`}>
        {!data.orders.length && <p className="font-body">No orders waiting.</p>}
        <ul className="space-y-2">
          {data.orders.map(o => (
            <li key={o.id} className="flex flex-wrap items-center gap-2 p-2 border-2 border-brand-black">
              <span className="flex-1 font-body">{o.emoji} {o.item} · {naira(o.price)} · <b>{o.camper?.name}</b> {o.camper?.phone}</span>
              <button type="button" className={`${btn} bg-brand-acid`} onClick={() => run(() => done({ playerId: me, orderId: o.id, refund: false }), 'Marked as collected.')}>Collected ✓</button>
              <button type="button" className={`${btn} bg-white`} onClick={() => { if (confirm('Refund this order to the camper\'s wallet?')) void run(() => done({ playerId: me, orderId: o.id, refund: true }), 'Refunded.'); }}>Refund</button>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Shop items">
        <div className="space-y-2 mb-4">
          {data.shop.map(i => (
            <div key={i.id} className="flex items-center gap-2">
              <span className="flex-1 font-body">{i.emoji} {i.name} · {naira(i.price)} {i.active ? '' : '(hidden)'}</span>
              <button type="button" className={`${btn} bg-white`} onClick={() => run(() => save({ playerId: me, id: i.id as Id<'shopItems'>, name: i.name, emoji: i.emoji, price: i.price, active: !i.active }), i.active ? 'Hidden from campers.' : 'Back on sale.')}>{i.active ? 'Hide' : 'Show'}</button>
            </div>
          ))}
          {!data.shop.length && <p className="font-body">No items yet.</p>}
        </div>
        <form className="flex flex-wrap gap-2 items-end" onSubmit={e => { e.preventDefault(); void run(async () => { await save({ playerId: me, name: item.name, emoji: item.emoji, price: Number(item.price.replace(/\D/g, '')), active: true }); setItem({ name: '', emoji: '🥤', price: '' }); }, 'Item added.'); }}>
          <input className={`${input} w-14 text-center`} value={item.emoji} onChange={e => setItem({ ...item, emoji: e.target.value })} aria-label="Emoji" />
          <input className={`${input} flex-1 min-w-32`} placeholder="Item name, e.g. Zobo" value={item.name} onChange={e => setItem({ ...item, name: e.target.value })} required />
          <input className={`${input} w-24`} placeholder="₦ price" inputMode="numeric" value={item.price} onChange={e => setItem({ ...item, price: e.target.value })} required />
          <button className={`${btn} bg-brand-acid`}>Add</button>
        </form>
      </Section>
    </>
  );
}

function Settings({ data, me, run }: TabProps) {
  const save = useMutation(api.walletAdmin.saveBank);
  const [f, setF] = useState(data.bank);
  return (
    <Section title="Bank details campers pay into">
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); void run(() => save({ playerId: me, ...f }), 'Bank details saved.'); }}>
        {([['bankName', 'Bank'], ['accountName', 'Account name'], ['accountNumber', 'Account number']] as const).map(([k, l]) => (
          <label key={k} className="block font-body text-sm">{l}<input className={`${input} block w-full`} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} required /></label>
        ))}
        <label className="block font-body text-sm">What to pay (shown to campers)<textarea className={`${input} block w-full`} rows={3} value={f.priceNote} onChange={e => setF({ ...f, priceNote: e.target.value })} /></label>
        <button className={`${btn} bg-brand-acid`}>Save</button>
      </form>
      {!!data.cashiers.length && (
        <div className="mt-5">
          <h3 className="font-display font-black uppercase mb-1">Cashiers</h3>
          <ul className="font-body text-sm">{data.cashiers.map((c, i) => <li key={i}>{c.name} · {c.phone}</li>)}</ul>
        </div>
      )}
    </Section>
  );
}
