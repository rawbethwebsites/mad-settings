'use client';

import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { gsap } from 'gsap';
import { BadgeCheck, Candy, Trees } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { CONNECT_PROMPTS, type ConnectMode } from '../../../convex/connectConstants';
import ConnectShell, { connectError, ConnectError, ConnectLoading, useConnectPlayer } from './ConnectShell';
import ConnectPhoto from './ConnectPhoto';
import HowItWorks from './HowItWorks';

type Swipe = 'log' | 'pass' | 'marshmallow';
export default function Trail() {
  const playerId = useConnectPlayer();
  const [mode, setMode] = useState<ConnectMode>('campfire');
  const me = useQuery(api.connect.me, playerId ? { playerId } : 'skip');
  const deck = useQuery(api.connect.deck, playerId ? { playerId, mode } : 'skip');
  const swipe = useMutation(api.connect.swipe); const backtrack = useMutation(api.connect.backtrack); const flag = useMutation(api.connect.flag); const block = useMutation(api.connect.block);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [reason, setReason] = useState('');
  const card = useRef<HTMLElement>(null); const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const top = deck?.cards[0];
  useLayoutEffect(() => { if (card.current) gsap.set(card.current, { x: 0, y: 0, rotation: 0, opacity: 1 }); }, [top?.id]);
  const choose = async (kind: Swipe) => {
    if (!playerId || !top || busy) return;
    setBusy(true); setError(''); setNotice('');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      if (!reduced && card.current) await gsap.to(card.current, { x: kind === 'pass' ? -180 : kind === 'log' ? 180 : 0, y: kind === 'marshmallow' ? -180 : 0, rotation: kind === 'pass' ? -12 : 12, opacity: 0, duration: .22 });
      await swipe({ playerId, target: top.id, mode, kind });
      setNotice(kind === 'pass' ? 'Skipped.' : kind === 'marshmallow' ? 'Super like sent.' : 'Like sent.');
      // TODO: play the camp swipe sound when src/lib/sfx.ts lands on this branch.
    } catch (e) { setError(connectError(e)); if (card.current) gsap.set(card.current, { x: 0, y: 0, rotation: 0, opacity: 1 }); }
    finally { setBusy(false); }
  };
  const start = (e: PointerEvent<HTMLDivElement>) => { if (!busy) { drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId }; e.currentTarget.setPointerCapture(e.pointerId); } };
  const move = (e: PointerEvent<HTMLDivElement>) => { const d = drag.current; if (!d || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; gsap.set(card.current, { x: (e.clientX - d.x) * .6, y: Math.min(0, e.clientY - d.y) * .6, rotation: (e.clientX - d.x) * .04 }); };
  const end = (e: PointerEvent<HTMLDivElement>) => { const d = drag.current; drag.current = null; if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (dy < -70 && Math.abs(dy) > Math.abs(dx)) void choose('marshmallow'); else if (Math.abs(dx) > 70) void choose(dx > 0 ? 'log' : 'pass'); else gsap.set(card.current, { x: 0, y: 0, rotation: 0 }); };
  return <ConnectShell title="Meet campers">
    <p className="connect-eyebrow">The Trail</p><HowItWorks />
    {me && <div className="connect-tabs" aria-label="Connection mode">{(['campfire', 'squad'] as const).map(m => <button key={m} className="connect-btn" aria-pressed={mode === m} disabled={busy} onClick={() => { setMode(m); setError(''); setNotice(''); }}>{m === 'campfire' ? 'Friends' : 'Teammates'}</button>)}</div>}
    <ConnectError error={error} />{notice && <p role="status" className="connect-notice">{notice}</p>}
    {me === undefined || deck === undefined ? <ConnectLoading /> : !me ? <section className="connect-panel connect-empty"><Trees size={48} /><h2>Find your people.</h2><Link className="connect-btn primary connect-submit" href="/connect/profile" style={{ marginTop: 16 }}>Start meeting campers →</Link></section> : <>
      {me.visibility !== 'everyone' && <p className="connect-notice">{me.visibility === 'paused' ? 'Your profile is paused.' : 'Only matches see you.'} <Link href="/connect/profile">Open My profile →</Link></p>}
      {top && playerId ? <>
        <article ref={card} className="connect-card poster-border poster-shadow" data-camper={top.campName}>
          <ConnectPhoto profileId={top.id} playerId={playerId} alt={`${top.campName}'s approved camp photo`} />
          <div className="connect-card-content"><div className="connect-between"><h2 className="font-display">{top.campName}</h2>{top.verified && <span className="connect-badge verified"><BadgeCheck size={16} />Ranger verified</span>}</div>
            {(top.sameRoom || top.marshmallow) && <div className="connect-row" style={{ marginTop: 12 }}>{top.sameRoom && <span className="connect-badge">In your room</span>}{top.marshmallow && <span className="connect-badge"><Candy size={16} />Super liked you</span>}</div>}
          </div>
        </article>
        <div className="connect-actions"><button className="connect-btn" disabled={busy} onClick={() => void choose('pass')}><span aria-hidden="true">✋</span>Skip</button><button className="connect-btn primary" disabled={busy || !deck.canLog || deck.logsLeft < 1} onClick={() => void choose('log')}><span aria-hidden="true">🪵</span>Like</button><button className="connect-btn" disabled={busy || !deck.canLog || deck.marshmallowsLeft < 1 || deck.logsLeft < 1} onClick={() => void choose('marshmallow')}><span aria-hidden="true">🍡</span>Super like</button><button className="connect-btn connect-undo" disabled={busy || deck.backtracksLeft < 1} onClick={async () => { setBusy(true); setError(''); try { await backtrack({ playerId, mode }); setNotice('Last choice undone.'); } catch (e) { setError(connectError(e)); } finally { setBusy(false); } }}><span aria-hidden="true">↩</span>Undo</button></div>
        <div className="connect-small connect-muted" style={{ touchAction: 'none', padding: '8px 20px', borderTop: '1px solid var(--cc-edge)' }} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={() => { drag.current = null; gsap.set(card.current, { x: 0, y: 0, rotation: 0 }); }}>← Skip · Like →</div>
        {(top.prompts.length > 0 || top.tags.length > 0) && <details className="connect-panel"><summary>About {top.campName}</summary>{top.prompts.map(p => <div className="connect-prompt" key={p.question}><span className="connect-eyebrow">{CONNECT_PROMPTS[p.question]}</span><p>{p.answer}</p></div>)}<div className="connect-tags">{top.tags.map(t => <span key={t} className="connect-badge">{t}</span>)}</div></details>}
        <details className="connect-small connect-muted"><summary>Daily limits</summary>{deck.logsLeft} likes · {deck.marshmallowsLeft} super likes · {deck.backtracksLeft} undos · resets midnight UTC</details>
        <details className="connect-panel"><summary style={{ minHeight: 44, cursor: 'pointer' }}>Camper safety</summary><label htmlFor="trail-flag" className="connect-label">Why are you flagging this profile?</label><textarea id="trail-flag" className="connect-input" maxLength={300} value={reason} onChange={e => setReason(e.target.value)} /><div className="connect-row" style={{ marginTop: 12 }}><button className="connect-btn" disabled={busy || !reason.trim()} onClick={async () => { setBusy(true); try { await flag({ playerId, target: top.id, reason }); setNotice('Your flag is with the Rangers.'); setReason(''); } catch (e) { setError(connectError(e)); } finally { setBusy(false); } }}>Flag to a Ranger</button><button className="connect-btn danger" disabled={busy} onClick={async () => { if (!confirm(`Block ${top.campName}? You will both disappear from each other's Trail.`)) return; setBusy(true); try { await block({ playerId, target: top.id }); setNotice('Camper blocked.'); } catch (e) { setError(connectError(e)); } finally { setBusy(false); } }}>Block camper</button></div></details>
      </> : <section className="connect-panel connect-empty"><Trees size={48} /><h2>{'modeOff' in deck && deck.modeOff ? 'This mode is off.' : 'You’re all caught up.'}</h2><p className="connect-muted">{'modeOff' in deck && deck.modeOff ? 'Open My profile to turn it on.' : 'Try Friends or Teammates above.'}</p><div className="connect-row" style={{ justifyContent: 'center', marginTop: 16 }}><Link href="/connect/profile" className="connect-btn">My profile</Link><button className="connect-btn" disabled={busy || !playerId || deck.backtracksLeft < 1} onClick={async () => { setBusy(true); setError(''); try { await backtrack({ playerId: playerId!, mode }); } catch (e) { setError(connectError(e)); } finally { setBusy(false); } }}>↩ Undo</button></div></section>}
    </>}
  </ConnectShell>;
}
