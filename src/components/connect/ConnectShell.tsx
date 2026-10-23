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
  const raw = error instanceof ConvexError && typeof error.data === 'string' ? error.data
    : (error instanceof Error ? error.message : '').match(/Uncaught (?:ConvexError|Error): (.+?)(?:\n|$)/)?.[1] ?? '';
  if (/two.*prompt|between 1 and 120/i.test(raw)) return 'Open Add more and answer both prompts, then tap Save.';
  if (/name.*already|pick another/i.test(raw)) return 'That name is taken; type another name and try again.';
  if (/18\+|at least 18/i.test(raw)) return 'You must be 18; tap Games to play instead.';
  if (/date of birth/i.test(raw)) return 'Check your birthday, then tap Save.';
  if (/names need|between 1 and 24/i.test(raw)) return 'Type a name with 2–24 letters, then try again.';
  if (/paused.*profile|profile is paused/i.test(raw)) return 'Open My profile and set visibility to Everyone.';
  if (/turn on.*in My camp|choose Campfire/i.test(raw)) return 'Open My profile, then turn on Friends or Teammates.';
  if (/already visited|nothing to backtrack|no.*backtrack/i.test(raw)) return 'Tap Skip on a camper before using Undo.';
  if (/used your|today|midnight/i.test(raw)) return 'Come back tomorrow; tap Games to play now.';
  if (/Ranger review|restricted|muted|Ranger.*help/i.test(raw)) return 'Ask a Ranger at camp to help with your profile.';
  if (/kind|rephrase/i.test(raw)) return 'Use kinder words, then tap Send again.';
  if (/handle|Instagram|Discord/i.test(raw)) return 'Open Add more and enter handles without links.';
  if (/photo|upload|JPEG|PNG|WebP/i.test(raw)) return 'Choose a JPEG, PNG or WebP under 5 MB and retry.';
  if (/left this Trail|no longer|closed|mutual Log/i.test(raw)) return 'Tap Meet campers to find someone else.';
  if (/contact|link|phone/i.test(raw)) return 'Remove links and contact details, then tap Send.';
  return 'Check your connection, then tap the button again.';
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
export function ConnectLoading() { return <p role="status" className="connect-loading">Loading campers…</p>; }
function ConnectionNotice() {
  const connection = useConvexConnectionState();
  const [lost, setLost] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setLost(!connection.isWebSocketConnected && connection.hasEverConnected), connection.isWebSocketConnected ? 0 : 3000);
    return () => window.clearTimeout(timer);
  }, [connection.isWebSocketConnected, connection.hasEverConnected]);
  return lost && !connection.isWebSocketConnected ? <p role="status" className="connect-notice">Reconnecting to camp… Wait a moment before sending.</p> : null;
}
export default function ConnectShell({ title, children }: { title: string; children: ReactNode }) {
  const pathname = usePathname();
  const ranger = pathname.startsWith('/ranger');
  const links = ranger ? [
    { href: '/ranger', title: 'Overview', Icon: Flame }, { href: '/ranger/photos', title: 'Photos', Icon: UserRound }, { href: '/ranger/reports', title: 'Reports', Icon: UsersRound },
  ] : [
    { href: '/connect', title: 'Meet campers', Icon: Footprints }, { href: '/connect/matches', title: 'Matches', Icon: Flame }, { href: '/connect/profile', title: 'My profile', Icon: UserRound },
  ];
  return <div className="connect-world"><div className="connect-wrap">
    <a href="#connect-main" className="skip-link">Skip to content</a>
    <header className="connect-header">
      <Link href="/" className="connect-wordmark" aria-label="MAD SETTINGS home">MAD SETTINGS<span>Campfire Connect</span></Link>
      <Link href="https://theboostnation.com" aria-label="Built by The Boost Nation" className="connect-btn"><Image src="/tbn-logo.png" alt="The Boost Nation" width={56} height={32} style={{ width: 56, height: 'auto', objectFit: 'contain' }} /></Link>
    </header>
    <div className="connect-between"><p className="connect-eyebrow">{ranger ? 'Look after the camp' : 'Friends + teammates'}</p><Link href={ranger ? '/connect' : '/games'} className="connect-btn">{ranger ? 'Meet campers' : 'Games'}</Link></div>
    <nav aria-label={ranger ? 'Ranger tools' : 'Campfire Connect'} className="connect-nav">{links.map(({ href, title, Icon }) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}><Icon size={18} aria-hidden="true" />{title}</Link>)}</nav>
    <ConnectionNotice />
    <main id="connect-main" tabIndex={-1}><h1 className="connect-title font-display">{title}</h1>{children}</main>
    <footer className="connect-small connect-muted" style={{ marginTop: 32 }}><details><summary>18+ · Safety & privacy</summary><p>Your profile stays in this browser. This is an event messenger, not a private account. Don’t send sensitive details.</p></details><Link href="/ranger" className="connect-btn" style={{ marginTop: 12 }}>Ranger help</Link></footer>
  </div></div>;
}
