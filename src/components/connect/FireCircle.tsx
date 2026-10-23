'use client';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { Flame } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import ConnectShell, { ConnectLoading, useConnectPlayer } from './ConnectShell';
import ConnectPhoto from './ConnectPhoto';

export default function FireCircle() {
  const playerId = useConnectPlayer(); const matches = useQuery(api.connect.listMatches, playerId ? { playerId } : 'skip');
  return <ConnectShell title="Fire Circle"><p className="connect-muted">Your people. A log with your name on it.</p>{matches === undefined || !playerId ? <ConnectLoading /> : matches.length === 0 ? <section className="connect-panel connect-empty"><Flame size={48} /><h2>No fires lit just yet.</h2><p className="connect-muted">Two Logs in the same mode start a conversation. Meet someone on the Trail.</p><Link className="connect-btn primary" href="/connect" style={{ marginTop: 24 }}>Walk the Trail</Link></section> : (['campfire', 'squad'] as const).map(mode => <section key={mode} style={{ marginTop: 28 }}><h2 className="connect-eyebrow">{mode === 'campfire' ? 'Campfire · Friends' : 'Squad · Game teammates'}</h2>{matches.filter(m => m.mode === mode).length === 0 && <p className="connect-small connect-muted" style={{ marginTop: 12 }}>No fires in this circle yet.</p>}{matches.filter(m => m.mode === mode).map(m => <Link key={m.id} href={`/connect/chat/${m.id}`} className="connect-match"><ConnectPhoto profileId={m.peer.id} playerId={playerId} preview alt={`${m.peer.campName}'s camp photo`} /><div style={{ minWidth: 0, flex: 1 }}><h3>{m.peer.campName}{m.peer.verified ? ' · Verified' : ''}</h3><p className="connect-small connect-muted" style={{ overflowWrap: 'anywhere' }}>{m.lastMessage ? m.lastMessage.slice(0, 90) : 'A new fire. Say hello.'}</p>{m.unread && <p className="connect-unread" aria-label="Unread messages">● Unread Tent Talk</p>}</div></Link>)}</section>)}</ConnectShell>;
}
