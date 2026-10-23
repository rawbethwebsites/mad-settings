'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useAction, useMutation, useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { camperId } from '@/lib/camper';
import { logOutOfThisPhone, naira, serverMessage, signInOnThisPhone, uploadReceipt } from '@/lib/account';
import { Btn } from '@/components/arcade/ui';
import { CAMP_DATE, CAMP_START, TICKETS, type TicketId } from '@/data/tickets';

const field = 'w-full p-3 border-[3px] border-brand-black bg-white font-body text-lg';
const label = 'block font-display font-bold text-xs uppercase tracking-widest mb-1';

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`p-5 poster-border poster-shadow mb-5 ${className.includes('bg-') ? '' : 'bg-white'} ${className}`}>{children}</section>;
}

export default function AccountPage() {
  const [key, setKey] = useState('');
  useEffect(() => { const t = setTimeout(() => setKey(camperId()), 0); return () => clearTimeout(t); }, []);
  const me = useQuery(api.accounts.me, key ? { playerKey: key } : 'skip');

  return (
    <main className="min-h-screen bg-brand-cream text-brand-black p-4 md:p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-5">
          <Link href="/games" className="min-h-11 flex items-center font-display font-bold text-sm uppercase">← Games</Link>
          <h1 className="font-display font-black text-2xl uppercase italic">My camp</h1>
          <span className="w-16" />
        </div>
        {!me ? null : me.account ? <Wallet me={me} playerKey={key} onLogout={() => { logOutOfThisPhone(); window.location.reload(); }} />
          : <SignIn onDone={k => { setKey(k); window.scrollTo(0, 0); }} />}
      </div>
    </main>
  );
}

function SignIn({ onDone }: { onDone: (key: string) => void }) {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const register = useAction(api.accounts.register);
  const login = useAction(api.accounts.login);
  const casino = useQuery(api.casino.lobby, { playerKey: '' });
  const [f, setF] = useState({ name: '', phone: '', password: '', email: '', guests: '1' });
  const [ticketId, setTicketId] = useState<TicketId>('attendee');
  const ticket = TICKETS.find(t => t.id === ticketId)!;
  const people = Math.max(1, Math.min(20, Number(f.guests) || 1));
  const total = ticket.id === 'attendee' ? ticket.price * people : ticket.price;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = mode === 'signup'
        ? await register({ name: f.name, phone: f.phone, password: f.password, email: f.email || undefined, ticket: ticketId, guests: people, playerKey: camperId() })
        : await login({ phone: f.phone, password: f.password });
      signInOnThisPhone(r.playerKey, r.name);
      onDone(r.playerKey);
    } catch (err) { setError(serverMessage(err)); }
    finally { setBusy(false); }
  };

  return (
    <Card>
      <div className="grid grid-cols-2 gap-2 mb-5">
        {(['signup', 'login'] as const).map(m => (
          <button key={m} type="button" onClick={() => { setMode(m); setError(''); }}
            className={`py-3 poster-border font-display font-black uppercase ${mode === m ? 'bg-brand-purple text-brand-cream' : 'bg-white'}`}>
            {m === 'signup' ? 'Sign up' : 'Log in'}
          </button>
        ))}
      </div>
      {mode === 'signup' && !!casino?.foundersLeft && (
        <p data-founders-left className="mb-4 p-3 border-4 border-[#d4a017] bg-[#0f3d2e] text-[#f5d76e] font-display font-black uppercase text-sm">
          ★ Founding spots left: {casino.foundersLeft}
          <span className="block font-body font-normal normal-case text-[#f3efe2]/85">The first 100 paid campers get {casino.founderChips.toLocaleString()} free casino chips and a gold badge.</span>
        </p>
      )}
      <form onSubmit={submit} className="space-y-4">
        {mode === 'signup' && (
          <div><label className={label} htmlFor="name">Your name</label><input id="name" className={field} value={f.name} onChange={set('name')} autoComplete="name" required /></div>
        )}
        <div><label className={label} htmlFor="phone">Phone number</label><input id="phone" className={field} value={f.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" required /></div>
        <div><label className={label} htmlFor="password">{mode === 'signup' ? 'Make a password' : 'Password'}</label><input id="password" type="password" className={field} value={f.password} onChange={set('password')} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={6} required /></div>
        {mode === 'signup' && (
          <>
            <div><label className={label} htmlFor="email">Email (optional)</label><input id="email" type="email" className={field} value={f.email} onChange={set('email')} autoComplete="email" /></div>
            <fieldset>
              <legend className={label}>Ticket · {CAMP_DATE} from {CAMP_START}</legend>
              <div className="grid gap-2">
                {TICKETS.map(t => (
                  <label key={t.id} className={`flex items-center justify-between gap-3 p-3 poster-border cursor-pointer ${ticketId === t.id ? 'bg-brand-acid' : 'bg-brand-cream'}`}>
                    <input type="radio" name="ticket" value={t.id} checked={ticketId === t.id} onChange={() => setTicketId(t.id)} className="sr-only" />
                    <span><span className="block font-display font-black uppercase leading-tight">{t.name}</span><span className="block font-body text-sm text-brand-black/60">{t.note}</span></span>
                    <span className="font-display font-black whitespace-nowrap">{naira(t.price)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {ticket.id === 'attendee' && (
              <div><label className={label} htmlFor="guests">How many people</label><input id="guests" inputMode="numeric" className={field} value={f.guests} onChange={set('guests')} /></div>
            )}
            <div className="flex items-baseline justify-between p-3 bg-brand-black text-brand-cream poster-border">
              <span className="font-display font-black uppercase text-sm tracking-widest">Total</span>
              <span className="font-display font-black text-2xl">{naira(total)}</span>
            </div>
          </>
        )}
        {error && <p role="alert" className="p-3 bg-brand-coral poster-border font-body">{error}</p>}
        <Btn className="w-full" disabled={busy}>{busy ? 'One moment…' : mode === 'signup' ? 'Create my account →' : 'Log in →'}</Btn>
        {mode === 'login' && <p className="font-body text-sm text-center text-brand-black/60">Forgot your password? Ask camp staff to reset it.</p>}
      </form>
    </Card>
  );
}

type Me = FunctionReturnType<typeof api.accounts.me>;

function BankDetails({ bank }: { bank: Me['bank'] }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="p-4 bg-brand-black text-brand-cream poster-border mb-4">
      <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-acid mb-1">Transfer to</div>
      <div className="font-display font-black text-3xl tracking-wider tabular-nums">{bank.accountNumber}</div>
      <div className="font-body">{bank.accountName}</div>
      <div className="font-body opacity-80">{bank.bankName}</div>
      <button type="button" onClick={() => { void navigator.clipboard?.writeText(bank.accountNumber).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
        className="mt-3 px-4 py-2 bg-brand-acid text-brand-black font-display font-black uppercase text-sm poster-border">{copied ? 'Copied ✓' : 'Copy account number'}</button>
    </div>
  );
}

function SendReceipt({ playerKey, kind, bank, cta, suggested }: { playerKey: string; kind: 'registration' | 'topup'; bank: Me['bank']; cta: string; suggested?: number | null }) {
  const uploadUrl = useMutation(api.accounts.proofUploadUrl);
  const submit = useMutation(api.accounts.submitPayment);
  const [amount, setAmount] = useState(suggested ? String(suggested) : '');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) { setMsg({ ok: false, text: 'Add a screenshot of your transfer receipt.' }); return; }
    setBusy(true); setMsg(null);
    try {
      const proof = await uploadReceipt(await uploadUrl({ playerKey }), file) as Id<'_storage'>;
      await submit({ playerKey, kind, amount: Number(amount.replace(/[^\d]/g, '')), proof });
      void fetch('/api/notify-receipt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerKey }) }).catch(() => {});
      setAmount(''); setFile(null);
      setMsg({ ok: true, text: 'Sent! Camp staff will check it and update your account.' });
    } catch (err) { setMsg({ ok: false, text: serverMessage(err) }); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={send}>
      <BankDetails bank={bank} />
      <ol className="font-body text-sm mb-4 list-decimal pl-5 space-y-1">
        <li>Transfer the money from your bank app.</li>
        <li>Take a screenshot of the receipt.</li>
        <li>Put the amount and the screenshot below.</li>
      </ol>
      <label className={label} htmlFor={`amount-${kind}`}>Amount you sent (₦)</label>
      <input id={`amount-${kind}`} className={`${field} mb-3`} inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 5000" required />
      <label className={label} htmlFor={`receipt-${kind}`}>Receipt screenshot</label>
      <input id={`receipt-${kind}`} type="file" accept="image/*,application/pdf" className="block w-full mb-4 font-body" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      {msg && <p role="status" className={`p-3 poster-border font-body mb-3 ${msg.ok ? 'bg-brand-acid' : 'bg-brand-coral'}`}>{msg.text}</p>}
      <Btn className="w-full" disabled={busy}>{busy ? 'Sending…' : cta}</Btn>
    </form>
  );
}

function Wallet({ me, playerKey, onLogout }: { me: Me; playerKey: string; onLogout: () => void }) {
  const a = me.account!;
  const buy = useMutation(api.accounts.buy);
  const changePassword = useAction(api.accounts.changePassword);
  const [shopMsg, setShopMsg] = useState('');
  const [pw, setPw] = useState({ old: '', next: '' });
  const [pwMsg, setPwMsg] = useState('');
  const feePending = me.payments?.some(p => p.kind === 'registration' && p.status === 'pending');
  const feeRejected = me.payments?.find(p => p.kind === 'registration' && p.status === 'rejected');

  return (
    <>
      <Card className="bg-brand-black text-brand-cream">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-display font-black text-xl uppercase">{a.name}</div>
            <div className="font-body text-sm opacity-70">{a.phone}</div>
          </div>
          <span className={`px-2 py-1 font-display font-black text-xs uppercase ${a.status === 'approved' ? 'bg-brand-acid text-brand-black' : 'bg-brand-coral text-brand-black'}`}>
            {a.status === 'approved' ? 'Paid camper ✓' : a.status === 'rejected' ? 'Not approved' : 'Payment pending'}
          </span>
        </div>
        <div className="mt-4 font-display font-bold text-xs uppercase tracking-widest opacity-60">Wallet</div>
        <div className="font-display font-black text-5xl text-brand-acid tabular-nums">{naira(a.balance)}</div>
      </Card>

      {a.status !== 'approved' && (
        <Card>
          <h2 className="font-display font-black text-xl uppercase mb-2">Pay your camp fee</h2>
          {feePending ? <p className="p-3 bg-brand-acid poster-border font-body">We got your receipt. Camp staff are checking it now. This page updates by itself.</p> : (
            <>
              {feeRejected && <p className="p-3 bg-brand-coral poster-border font-body mb-3">Your last receipt was not approved{feeRejected.note ? `: ${feeRejected.note}` : '.'} Send it again below.</p>}
              {a.ticket && a.ticketTotal
                ? <p className="p-3 poster-border bg-brand-cream font-body mb-3">Your ticket: <b>{a.ticket}</b>{a.ticket === 'Attendee' ? ` × ${a.guests}` : ''}. Send <b>{naira(a.ticketTotal)}</b>.</p>
                : <p className="font-body mb-3">{me.bank.priceNote}</p>}
              <SendReceipt playerKey={playerKey} kind="registration" bank={me.bank} cta="Send my receipt →" suggested={a.ticketTotal} />
            </>
          )}
        </Card>
      )}

      {a.status === 'approved' && (
        <>
          <Card>
            <h2 className="font-display font-black text-xl uppercase mb-1">Top up your wallet</h2>
            <p className="font-body text-sm mb-3 text-brand-black/70">Use your wallet for paid games and the camp shop. Wallet money can&apos;t be withdrawn.</p>
            <SendReceipt playerKey={playerKey} kind="topup" bank={me.bank} cta="Send top-up receipt →" />
          </Card>
          <Link href="/casino" className="block mb-5 p-4 border-4 border-[#d4a017] bg-[#0f3d2e] text-[#f5d76e] shadow-[6px_6px_0_#000] font-display font-black uppercase">
            🎰 Casino Night: buy chips and play friends →
          </Link>
          {!!me.shop?.length && (
            <Card>
              <h2 className="font-display font-black text-xl uppercase mb-3">Camp shop</h2>
              <div className="grid grid-cols-2 gap-3">
                {me.shop.map(i => (
                  <button key={i.id} type="button" disabled={a.balance < i.price}
                    onClick={async () => { setShopMsg(''); if (!confirm(`Buy ${i.name} for ${naira(i.price)}?`)) return; try { await buy({ playerKey, itemId: i.id }); setShopMsg(`Bought ${i.name}! Show this page to camp staff to collect it.`); } catch (e) { setShopMsg(serverMessage(e)); } }}
                    className="p-3 poster-border bg-brand-cream text-left disabled:opacity-40">
                    <div className="text-3xl">{i.emoji}</div>
                    <div className="font-display font-black uppercase text-sm">{i.name}</div>
                    <div className="font-body">{naira(i.price)}</div>
                  </button>
                ))}
              </div>
              {shopMsg && <p role="status" className="mt-3 p-3 poster-border bg-brand-acid font-body">{shopMsg}</p>}
            </Card>
          )}
          {!!me.orders?.some(o => o.status === 'paid') && (
            <Card>
              <h2 className="font-display font-black text-xl uppercase mb-2">To collect</h2>
              <ul className="font-body space-y-1">{me.orders.filter(o => o.status === 'paid').map(o => <li key={o.id}>{o.emoji} {o.item} · {naira(o.price)}</li>)}</ul>
              <p className="font-body text-sm mt-2 text-brand-black/60">Show this to camp staff to pick them up.</p>
            </Card>
          )}
          {!!Object.keys(me.prices ?? {}).length && (
            <Card>
              <h2 className="font-display font-black text-xl uppercase mb-2">Paid games</h2>
              <ul className="font-body space-y-1">{Object.entries(me.prices!).map(([g, p]) => <li key={g}><Link className="underline" href={`/games/${g}`}>{g}</Link> · {naira(p)} per visit</li>)}</ul>
            </Card>
          )}
        </>
      )}

      {!!me.payments?.length && (
        <Card>
          <h2 className="font-display font-black text-xl uppercase mb-2">Receipts</h2>
          <ul className="font-body text-sm space-y-2">
            {me.payments.map(p => (
              <li key={p.id} className="flex justify-between gap-2">
                <span>{p.kind === 'registration' ? 'Camp fee' : 'Top-up'} · {naira(p.amount)}</span>
                <span className={`font-display font-black uppercase text-xs ${p.status === 'approved' ? 'text-green-700' : p.status === 'rejected' ? 'text-brand-coral' : ''}`}>{p.status === 'pending' ? 'Checking…' : p.status}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!!me.entries?.length && (
        <Card>
          <h2 className="font-display font-black text-xl uppercase mb-2">Wallet history</h2>
          <ul className="font-body text-sm space-y-2">
            {me.entries.map(e => (
              <li key={e.id} className="flex justify-between gap-2">
                <span>{e.label}<span className="block text-xs text-brand-black/50">{new Date(e.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</span></span>
                <span className={`font-display font-black tabular-nums ${e.amount > 0 ? 'text-green-700' : ''}`}>{e.amount > 0 ? '+' : '−'}{naira(Math.abs(e.amount))}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {me.staff && <Link href="/admin" className="block mb-5 py-3 text-center poster-border bg-brand-purple text-brand-cream font-display font-black uppercase">Open camp admin →</Link>}

      <Card>
        <details>
          <summary className="font-display font-black uppercase cursor-pointer min-h-11 flex items-center">Change password</summary>
          <form className="space-y-3 mt-3" onSubmit={async e => { e.preventDefault(); setPwMsg(''); try { await changePassword({ playerKey, oldPassword: pw.old, newPassword: pw.next }); setPw({ old: '', next: '' }); setPwMsg('Password changed.'); } catch (err) { setPwMsg(serverMessage(err)); } }}>
            <input type="password" className={field} placeholder="Current password" value={pw.old} onChange={e => setPw({ ...pw, old: e.target.value })} autoComplete="current-password" required />
            <input type="password" className={field} placeholder="New password" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" minLength={6} required />
            {pwMsg && <p role="status" className="font-body">{pwMsg}</p>}
            <Btn variant="light" className="w-full">Save new password</Btn>
          </form>
        </details>
      </Card>
      <Btn variant="light" className="w-full mb-10" onClick={() => { if (confirm('Log out of your camp account on this phone?')) onLogout(); }}>Log out of this phone</Btn>
    </>
  );
}
