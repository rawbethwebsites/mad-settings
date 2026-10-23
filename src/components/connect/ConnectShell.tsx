'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useConvexConnectionState } from 'convex/react';
import { Flame, Footprints, UserRound, UsersRound } from 'lucide-react';
import { camperId } from '@/lib/camper';
import { ConvexError } from 'convex/values';

export function connectError(error: unknown) {
  if (error instanceof ConvexError && typeof error.data === 'string') return error.data;
  const message = error instanceof Error ? error.message : '';
  return message.match(/Uncaught (?:ConvexError|Error): (.+?)(?:\n|$)/)?.[1] ?? 'The camp connection could not finish that. Please try again.';
}

export function useConnectPlayer() {
  const [id] = useState<string | null>(() => typeof window === 'undefined' ? null : camperId());
  return id;
}
export function useConnectTime() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}
export function ConnectError({ error }: { error: string }) { return error ? <p role="alert" className="connect-notice connect-error">{error}</p> : null; }
export function ConnectLoading() { return <p role="status" className="connect-loading">Gathering around the fire…</p>; }
export default function ConnectShell({ title, children }: { title: string; children: ReactNode }) {
  const pathname = usePathname();
  const connection = useConvexConnectionState();
  const ranger = pathname.startsWith('/ranger');
  const links = ranger ? [
    { href: '/ranger', title: 'Overview', Icon: Flame }, { href: '/ranger/photos', title: 'Photos', Icon: UserRound }, { href: '/ranger/reports', title: 'Reports', Icon: UsersRound },
  ] : [
    { href: '/connect', title: 'The Trail', Icon: Footprints }, { href: '/connect/matches', title: 'Fire Circle', Icon: Flame }, { href: '/connect/profile', title: 'My camp', Icon: UserRound },
  ];
  return <div className="connect-world"><div className="connect-wrap">
    <a href="#connect-main" className="skip-link">Skip to content</a>
    <header className="connect-header">
      <Link href="/" className="connect-wordmark" aria-label="MAD SETTINGS home">MAD SETTINGS<span>Campfire Connect</span></Link>
      <Link href="https://theboostnation.com" aria-label="Built by The Boost Nation" className="connect-btn"><Image src="/tbn-logo.png" alt="The Boost Nation" width={56} height={32} style={{ width: 56, height: 'auto', objectFit: 'contain' }} /></Link>
    </header>
    <div className="connect-between"><p className="connect-eyebrow">{ranger ? 'Look after the camp' : 'Friends. Teammates. Good company.'}</p><Link href={ranger ? '/connect' : '/games'} className="connect-btn">{ranger ? 'Back to Trail' : 'Camp games'}</Link></div>
    <nav aria-label={ranger ? 'Ranger tools' : 'Campfire Connect'} className="connect-nav">{links.map(({ href, title, Icon }) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}><Icon size={18} aria-hidden="true" />{title}</Link>)}</nav>
    {!connection.isWebSocketConnected && <p role="status" className="connect-notice">Reconnecting to camp… Your last view may be out of date. Please wait before sending.</p>}
    <main id="connect-main" tabIndex={-1}><h1 className="connect-title font-display">{title}</h1>{children}</main>
    <footer className="connect-small connect-muted" style={{ marginTop: 40 }}><p>18+ only · Campfire is for friends. Squad is for teammates.</p><p style={{ marginTop: 8 }}>Your camper key lives in this browser. This is event-level privacy, not an authenticated private messenger. Never share sensitive details.</p><Link href="/ranger" className="connect-btn" style={{ marginTop: 16 }}>Ranger station</Link></footer>
  </div></div>;
}
