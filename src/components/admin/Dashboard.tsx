'use client';

// The live camp dashboard: every number updates by itself as campers sign up.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { api } from '../../../convex/_generated/api';
import { naira } from '@/lib/account';

type Stats = NonNullable<FunctionReturnType<typeof api.walletAdmin.stats>>;
export type JumpTo = 'Payments' | 'Campers' | 'Shop';

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Counts up (or down) to the new value, and flashes when it changes
function useCount(value: number) {
  const [shown, setShown] = useState(reduced() ? value : 0);
  const from = useRef(shown);
  useEffect(() => {
    if (reduced()) { const t = setTimeout(() => setShown(value), 0); return () => clearTimeout(t); }
    const start = performance.now(), a = from.current, ms = 900;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / ms), e = 1 - Math.pow(1 - k, 3);
      const v = Math.round(a + (value - a) * e);
      from.current = v; setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown;
}

function Num({ value, format = (n: number) => n.toLocaleString() }: { value: number; format?: (n: number) => string }) {
  const shown = useCount(value);
  return <span key={value} className="admin-pop inline-block tabular-nums">{format(shown)}</span>;
}

function ago(at: number, now: number) {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86_400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86_400)}d ago`;
}

function Tile({ label, children, sub, className = '', delay = 0, onClick }: { label: string; children: ReactNode; sub?: ReactNode; className?: string; delay?: number; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} style={{ animationDelay: `${delay}ms` }}
      className={`admin-rise admin-lift text-left p-4 poster-border bg-white ${className}`}>
      <div className="font-display font-bold text-xs uppercase tracking-widest opacity-70">{label}</div>
      <div className="font-display font-black text-3xl md:text-4xl leading-tight mt-1">{children}</div>
      {sub && <div className="font-body text-sm mt-1 opacity-80">{sub}</div>}
    </Tag>
  );
}

function SignupChart({ perDay }: { perDay: Stats['perDay'] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...perDay.map(d => d.count));
  const day = (t: number) => new Date(t).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const last = perDay.length - 1;
  return (
    <div>
      <div className="relative h-44 flex items-end gap-[2px] border-b-2 border-brand-black/20" onMouseLeave={() => setHover(null)}>
        {perDay.map((d, i) => (
          <button key={d.day} type="button" aria-label={`${day(d.day)}: ${d.count} sign-up${d.count === 1 ? "" : "s"}`}
            onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
            className="relative flex-1 h-full flex items-end justify-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-black">
            <span className={`admin-grow block w-full max-w-7 rounded-t-[4px] ${i === last ? 'bg-brand-purple' : 'bg-brand-purple/55'} ${hover === i ? 'bg-brand-purple' : ''}`}
              style={{ height: `${d.count ? Math.max(4, (d.count / max) * 100) : 0}%`, animationDelay: `${i * 35}ms` }} />
            {hover === i && (
              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap px-2 py-1 bg-brand-black text-brand-cream font-body text-xs pointer-events-none">
                {day(d.day)} · <b>{d.count}</b> sign-up{d.count === 1 ? '' : 's'}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="flex justify-between font-body text-xs opacity-60 mt-1">
        <span>{day(perDay[0].day)}</span><span>Today</span>
      </div>
    </div>
  );
}

function Bars({ rows, unit }: { rows: { label: string; value: number; note?: string }[]; unit: string }) {
  const max = Math.max(1, ...rows.map(r => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.label}>
          <div className="flex justify-between font-body text-sm"><span className="font-display font-black uppercase">{r.label}</span><span><b className="tabular-nums">{r.value}</b> {unit}{r.note ? ` · ${r.note}` : ''}</span></div>
          <div className="h-3 bg-brand-black/10 mt-1 overflow-hidden">
            <div className="admin-fill h-full bg-brand-purple rounded-r-[4px]" style={{ width: `${(r.value / max) * 100}%`, animationDelay: `${i * 120}ms` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Dashboard({ me, jump }: { me: string; jump: (tab: JumpTo) => void }) {
  const s = useQuery(api.walletAdmin.stats, { playerId: me });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 20_000); return () => clearInterval(t); }, []);
  if (!s) return <div className="h-64 poster-border bg-white admin-shimmer" aria-label="Loading the dashboard" />;
  const tentsLeft = Math.max(0, s.tents.total - s.tents.taken);
  const tentPct = Math.min(100, (s.tents.taken / s.tents.total) * 100);

  return (
    <div className="space-y-5">
      <section className="admin-rise relative overflow-hidden p-5 md:p-6 poster-border poster-shadow bg-brand-black text-brand-cream">
        <div className="admin-glow absolute -right-16 -top-16 w-56 h-56 rounded-full bg-brand-purple/50 blur-3xl" aria-hidden="true" />
        <div className="relative flex items-center gap-2 font-display font-bold text-xs uppercase tracking-widest">
          <span className="admin-live w-2.5 h-2.5 rounded-full bg-brand-acid" aria-hidden="true" /> Live · campers registered
        </div>
        <div className="relative font-display font-black text-7xl md:text-8xl text-brand-acid leading-none mt-2"><Num value={s.campers} /></div>
        <div className="relative flex flex-wrap gap-2 mt-3 font-display font-black uppercase text-sm">
          <span className="px-2 py-1 bg-brand-cream text-brand-black"><Num value={s.people} /> people coming</span>
          <span className={`px-2 py-1 ${s.today ? 'bg-brand-acid text-brand-black admin-wiggle' : 'bg-brand-cream/15'}`}>+<Num value={s.today} /> today</span>
          {!!s.lastHour && <span className="px-2 py-1 bg-brand-coral text-brand-black">🔥 {s.lastHour} in the last hour</span>}
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Tents left" delay={60} className={tentsLeft <= 10 ? 'bg-brand-coral' : ''}
          sub={<><div className="h-2 bg-brand-black/15 mt-1 overflow-hidden"><div className="admin-fill h-full bg-brand-black" style={{ width: `${tentPct}%` }} /></div><span className="block mt-1">{s.tents.taken} of {s.tents.total} taken</span></>}>
          <Num value={tentsLeft} />
        </Tile>
        <Tile label="Founding campers" delay={120} sub="Free chips + gold badge"><Num value={s.founders} /></Tile>
        <Tile label="Receipts to check" delay={180} className={s.waiting.receipts ? 'bg-brand-acid' : ''} onClick={() => jump('Payments')} sub={s.waiting.receipts ? 'Tap to check →' : 'All clear'}>
          <Num value={s.waiting.receipts} />
        </Tile>
        <Tile label="Shop orders" delay={240} className={s.waiting.orders ? 'bg-brand-acid' : ''} onClick={() => jump('Shop')} sub={s.waiting.orders ? 'Tap to hand over →' : 'All clear'}>
          <Num value={s.waiting.orders} />
        </Tile>
      </div>

      <section className="admin-rise p-4 poster-border poster-shadow bg-white" style={{ animationDelay: '120ms' }}>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-display font-black text-lg uppercase">Sign-ups, last 14 days</h2>
          <span className="font-body text-sm opacity-70">Tap a bar for the day</span>
        </div>
        <SignupChart perDay={s.perDay} />
      </section>

      <div className="grid md:grid-cols-2 gap-5">
        <section className="admin-rise p-4 poster-border poster-shadow bg-white" style={{ animationDelay: '180ms' }}>
          <h2 className="font-display font-black text-lg uppercase mb-3">How they&apos;re staying</h2>
          <Bars unit="people" rows={s.stay.map(r => ({ label: r.label, value: r.people, note: r.label === 'Attendee' ? `${r.campers} sign-ups` : `${r.campers} tents` }))} />
          <h3 className="font-display font-black uppercase mt-5 mb-3">Campers</h3>
          <Bars unit="campers" rows={[{ label: 'Female', value: s.gender.female }, { label: 'Male', value: s.gender.male }, ...(s.gender.unset ? [{ label: 'Not set', value: s.gender.unset }] : [])]} />
        </section>

        <section className="admin-rise p-4 poster-border poster-shadow bg-white" style={{ animationDelay: '240ms' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-black text-lg uppercase">Just joined</h2>
            <button type="button" className="font-display font-bold text-xs uppercase underline" onClick={() => jump('Campers')}>All campers →</button>
          </div>
          {!s.newest.length && <p className="font-body">No campers yet. They&apos;ll pop in here as they sign up.</p>}
          <ul className="space-y-2">
            {s.newest.map((c, i) => (
              <li key={c.id} className="admin-slide flex items-center gap-3 p-2 border-2 border-brand-black/15" style={{ animationDelay: `${i * 50}ms` }}>
                <span className="w-9 h-9 shrink-0 grid place-items-center bg-brand-purple text-brand-cream font-display font-black uppercase">{c.name.slice(0, 1)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-black uppercase truncate">{c.name}</span>
                  <span className="block font-body text-xs opacity-70">{c.ticket}{c.ticket === 'Attendee' && c.guests > 1 ? ` × ${c.guests}` : ''}</span>
                </span>
                <span className={`font-body text-xs whitespace-nowrap ${now - c.at < 600_000 ? 'px-1.5 py-0.5 bg-brand-acid font-bold' : 'opacity-60'}`}>{ago(c.at, now)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Tile label="In camper wallets" delay={300}><Num value={s.money.wallets} format={naira} /></Tile>
        <Tile label="Topped up so far" delay={340}><Num value={s.money.toppedUp} format={naira} /></Tile>
        <Tile label="Casino chips held" delay={380}><Num value={s.money.chips} /></Tile>
        <Tile label="Meet campers profiles" delay={420}><Num value={s.connect.profiles} /></Tile>
        <Tile label="Matches" delay={460} sub={`${s.connect.messages.toLocaleString()} messages sent`}><Num value={s.connect.matches} /></Tile>
        <Tile label="On hold" delay={500} onClick={() => jump('Campers')} sub="Paused by staff"><Num value={s.onHold} /></Tile>
      </div>
    </div>
  );
}
