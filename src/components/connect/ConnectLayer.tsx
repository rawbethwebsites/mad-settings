'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { Flame, X } from 'lucide-react';
import { gsap } from 'gsap';
import { api } from '../../../convex/_generated/api';
import { useConnectPlayer } from './ConnectShell';
import './connect.css';

export default function ConnectLayer() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return null;
  return <LiveLayer />;
}
function LiveLayer() {
  const playerId = useConnectPlayer(); const notifications = useQuery(api.connect.notifications, playerId ? { playerId } : 'skip');
  const ack = useMutation(api.connect.ackNotification); const [celebrated, setCelebrated] = useState<string[]>([]);
  const active = notifications?.[0];
  const dismiss = () => { if (!playerId || !active) return; void ack({ playerId, matchId: active.id }).catch(() => {}); };
  return <div className="connect-global" aria-live="polite">{active && <>
    <div className="connect-toast" role="status"><div className="connect-between"><strong>You matched with {active.campName}!</strong><button className="connect-btn" aria-label="Dismiss match notification" onClick={dismiss}><X size={18} /></button></div><p className="connect-small connect-muted">{active.mode === 'campfire' ? 'Friends' : 'Teammates'}</p><Link className="connect-btn primary" style={{ marginTop: 12 }} href={`/connect/chat/${active.id}`} onClick={dismiss}>Open Chat</Link></div>
    {!celebrated.includes(active.id) && <Celebration key={active.id} campName={active.campName} onClose={() => setCelebrated(s => [...s, active.id])} href={`/connect/chat/${active.id}`} onOpen={dismiss} />}
  </>}</div>;
}
function Celebration({ campName, onClose, href, onOpen }: { campName: string; onClose: () => void; href: string; onOpen: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null); const art = useRef<HTMLDivElement>(null);
  useEffect(() => { const d = dialog.current; if (d && !d.open) d.showModal(); return () => d?.close(); }, []);
  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const context = gsap.context(() => {
      gsap.fromTo('[data-flame=left]', { x: -70, rotation: -12 }, { x: 0, rotation: 0, duration: .35, ease: 'power2.out' });
      gsap.fromTo('[data-flame=right]', { x: 70, rotation: 12 }, { x: 0, rotation: 0, duration: .35, ease: 'power2.out' });
      gsap.fromTo('.connect-sparks i', { x: 0, y: 0, opacity: 1 }, { x: i => Math.cos(i * Math.PI / 6) * 100, y: i => Math.sin(i * Math.PI / 6) * 70, opacity: 0, duration: .5, delay: .3 });
    }, art);
    // TODO: play the match chime when src/lib/sfx.ts is added to this branch.
    return () => context.revert();
  }, []);
  return <dialog ref={dialog} className="connect-global connect-celebrate" style={{ width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', margin: 0, border: 0 }} aria-labelledby="connect-match-title" onCancel={e => { e.preventDefault(); onClose(); }}><div className="connect-celebrate-inner"><div ref={art} aria-hidden="true" className="connect-flames"><Flame size={96} data-flame="left" /><Flame size={96} data-flame="right" /><span className="connect-sparks">{Array.from({ length: 12 }, (_, i) => <i key={i} />)}</span></div><h2 id="connect-match-title" className="connect-title font-display">You lit a fire!</h2><p>You and {campName} liked each other.</p><div className="connect-row" style={{ justifyContent: 'center', marginTop: 24 }}><Link className="connect-btn primary" href={href} onClick={onOpen}>Open Chat</Link><button className="connect-btn" onClick={onClose} autoFocus>Meet more campers</button></div></div></dialog>;
}
