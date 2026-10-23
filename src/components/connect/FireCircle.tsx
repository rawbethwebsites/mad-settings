'use client';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { ArrowRight, Flame, MessageCircle } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import ConnectShell, { ConnectLoading, useConnectPlayer } from './ConnectShell';
import ConnectPhoto from './ConnectPhoto';

export default function FireCircle() {
  const playerId = useConnectPlayer(); const matches = useQuery(api.connect.listMatches, playerId ? { playerId } : 'skip');
  return <ConnectShell title="Matches">{matches === undefined || !playerId ? <ConnectLoading /> : matches.length === 0 ? <section className="connect-panel connect-empty"><Flame size={48} /><h2>No matches yet.</h2><p className="connect-muted">Like each other to chat.</p><Link className="connect-btn primary" href="/connect" style={{ marginTop: 16 }}><ArrowRight size={20} aria-hidden="true" />Meet campers</Link></section> : <><p className="connect-muted">Tap a camper to chat.</p>{(['campfire', 'squad'] as const).filter(mode => matches.some(m => m.mode === mode)).map(mode => <section key={mode} style={{ marginTop: 24 }}><h2 className="connect-eyebrow">{mode === 'campfire' ? 'Friends' : 'Teammates'}</h2>{matches.filter(m => m.mode === mode).map(m => <Link key={m.id} href={`/connect/chat/${m.id}`} className="connect-match" aria-label={`Chat with ${m.peer.campName}`}><ConnectPhoto profileId={m.peer.id} playerId={playerId} preview alt={`${m.peer.campName}'s camp photo`} /><div style={{ minWidth: 0, flex: 1 }}><h3>{m.peer.campName}{m.peer.verified ? ' · Verified' : ''}</h3><p className="connect-small connect-muted" style={{ overflowWrap: 'anywhere' }}>{m.lastMessage ? m.lastMessage.slice(0, 90) : 'Say hello.'}</p>{m.unread && <p className="connect-unread" aria-label="Unread messages">● New message</p>}</div><MessageCircle size={20} aria-hidden="true" /></Link>)}</section>)}</>}</ConnectShell>;
}
