'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { Card, CardStack, FannedHand } from './Card';
import { useCardTableMotion } from './useCardTableMotion';

export function CampTable({ children, variant = 'felt', className = '', style }: {
  children: ReactNode; variant?: 'felt' | 'wood'; className?: string; style?: CSSProperties;
}) {
  return (
    <div className={`camp-table ${className}`} style={style}>
      <div className={`camp-surface camp-surface-${variant}`}>
        <div className="camp-glow" aria-hidden="true" />
        {children}
      </div>
      <style>{`
        .camp-table { position:relative; padding:10px; width:100%; min-width:0; color:#ffedce; border:1px solid #b58659; border-radius:23px; background:repeating-linear-gradient(2deg,#ffffff05 0 1px,#301b1612 1px 3px,transparent 3px 8px),repeating-linear-gradient(90deg,transparent 0 83px,#39231b44 84px 85px),linear-gradient(110deg,#a97546,#79502f 40%,#ad7b4c 75%,#87532e); box-shadow:0 12px 24px #25140c40,inset 0 1px 0 #e6c38e; }
        .camp-surface { position:relative; border-radius:14px; border:1px solid #d6bb7866; background:radial-gradient(ellipse at 80% 100%,#97714180,transparent 70%),repeating-linear-gradient(0deg,#fff9df05 0 1px,transparent 1px 3px),repeating-linear-gradient(90deg,#251b0908 0 1px,transparent 1px 3px),#45533b; }
        .camp-surface-wood { background:repeating-linear-gradient(2deg,#ffffff05 0 1px,transparent 1px 4px),#815834; }
        .camp-surface::before { content:''; position:absolute; pointer-events:none; inset:5px; border:1px dashed #ead6a530; border-radius:10px; }
        .camp-glow { position:absolute; pointer-events:none; inset:0; border-radius:inherit; background:radial-gradient(ellipse at 90% 100%,#ffad4260,transparent 68%); animation:camp-card-fire 4s ease-in-out infinite; }
        @keyframes camp-card-fire { 0%,100% {opacity:.7} 50% {opacity:1} }
        .card-table { position:relative; padding:13px 11px 15px; min-width:0; }
        .card-table-kicker { display:flex; justify-content:space-between; align-items:center; gap:6px; font-size:9px; font-weight:800; letter-spacing:.16em; color:#f3dcaf; margin-bottom:11px; }
        .card-opponents { display:flex; gap:7px; justify-content:center; margin-bottom:16px; }
        .card-opponent { width:100%; max-width:150px; min-width:0; border:1px solid #e8d3a134; border-radius:10px; padding:7px 3px 4px; background:#fff0c80a; text-align:center; }
        .card-opponent[data-active=true] { border-color:#e4dc82; background:#f4d59616; }
        .card-opponent-name { font-size:9px; font-weight:800; line-height:1.4; overflow-wrap:anywhere; text-transform:uppercase; }
        .card-opponent-count { font-size:9px; color:#e7d9b9; margin-top:2px; }
        .card-center { display:flex; align-items:center; justify-content:center; gap:39px; padding:0 0 8px; }
        .card-market { border:0; padding:5px 2px 0; background:transparent; color:inherit; cursor:pointer; min-width:76px; min-height:140px; }
        .card-market:disabled { cursor:default; }
        .card-market:focus-visible,.hand-card:focus-visible,.card-choice button:focus-visible { outline:3px solid #e8ed88; outline-offset:4px; border-radius:7px; }
        .card-market-caption { display:block; font-size:9px; letter-spacing:.09em; margin-top:11px; font-weight:800; }
        .card-market-hint { display:block; font-size:9px; margin-top:2px; color:#f3dcb0; }
        .card-discard { width:84px; text-align:center; }
        .card-pile { width:84px; height:122px; position:relative; }
        .card-pile::before { content:''; position:absolute; inset:1px; border-radius:7px; background:#ebddc0; border:1px solid #c7b18b; transform:translate(-3px,3px) rotate(-5deg); }
        .card-match { min-height:25px; padding-top:9px; font-size:10px; font-weight:850; text-transform:uppercase; letter-spacing:.07em; display:flex; align-items:center; justify-content:center; gap:5px; white-space:nowrap; }
        .card-log { min-height:40px; margin:4px auto 9px; max-width:400px; font-size:12px; line-height:1.5; text-align:center; color:#f7e7c7; text-wrap:pretty; }
        .card-player { border-top:1px solid #e8d3a142; padding-top:11px; }
        .card-hand-heading { display:flex; justify-content:space-between; align-items:center; gap:5px; margin-bottom:11px; font-size:10px; font-weight:850; letter-spacing:.05em; text-transform:uppercase; }
        .card-hand-heading strong { color:#e8ed88; }
        .card-hand-count { color:#ecdbb8; font-size:9px; white-space:nowrap; }
        .card-hand { display:flex; flex-wrap:wrap; gap:8px 7px; justify-content:center; align-items:flex-start; width:100%; max-width:600px; margin:0 auto; }
        .hand-card { position:relative; border:0; border-radius:7px; padding:0; background:none; width:64px; height:92.445px; flex:0 0 64px; cursor:pointer; touch-action:manipulation; }
        .hand-card[data-playable=true] { box-shadow:0 0 0 2px #dee88e; }
        .hand-card[data-playable=false] [data-card] { opacity:.66; }
        .hand-card:disabled { cursor:default; }
        .card-hand-tip { text-align:center; font-size:10px; color:#eddbb4; margin:12px 0 0; }
        .card-empty-hand { font-family:Georgia,serif; font-style:italic; font-size:19px; text-align:center; padding:22px 0; color:#f4e4bf; }
        .card-callout { position:absolute; top:42%; left:6px; right:6px; z-index:4; padding:12px 8px; border-radius:9px; color:#ffe6a1; background:#543b26f2; border:1px solid #f8d282; text-align:center; font-size:22px; font-weight:950; opacity:0; visibility:hidden; pointer-events:none; }
        .card-winner-glow { position:absolute; inset:0; border-radius:12px; box-shadow:inset 0 0 40px #ffe28f; opacity:0; visibility:hidden; pointer-events:none; }
        .card-error { margin:10px 0 0; border:1px solid #f2b49b; border-radius:6px; background:#4b211b; color:#ffdfc8; padding:9px; font-size:12px; }
        .card-choice-shade { position:fixed; inset:0; z-index:100; display:flex; align-items:center; justify-content:center; padding:18px; background:#201209a6; }
        .card-choice { width:100%; max-width:370px; background:#f4e8cc; color:#493024; border:2px solid #b18a55; border-radius:14px; padding:20px 16px 14px; box-shadow:0 12px 24px #160c0860; }
        .card-choice h2 { margin:0 0 7px; font-size:17px; font-weight:900; }
        .card-choice p { font-size:12px; margin:0 0 15px; }
        .card-choice-options { display:flex; justify-content:center; flex-wrap:wrap; gap:7px; }
        .card-choice button { min-width:48px; min-height:48px; border:1px solid #a58a65; border-radius:7px; padding:10px; cursor:pointer; background:#fff8e6; font-weight:850; }
        .card-choice-options button { flex:1 0 44%; display:flex; align-items:center; justify-content:center; gap:8px; font-size:13px; text-transform:uppercase; }
        .card-choice .card-choice-cancel { margin-top:14px; width:100%; background:transparent; font-size:12px; border:0; text-decoration:underline; }
        @media (min-width:600px) { .card-table {padding:22px 28px} .card-center {gap:65px} .card-opponents {margin-bottom:23px} .card-log {margin-bottom:15px} .card-hand {gap:11px} .hand-card {width:72px;height:104px;flex-basis:72px} }
        @media (prefers-reduced-motion:reduce) { .camp-glow {animation:none} }
      `}</style>
    </div>
  );
}

export type HandCard = { id: string; label: string; front: ReactNode; playable: boolean };

export function CardGameTable({ game, names, counts, hand, seat, turn, winner, marketCount, topKey, topFace, backFace, match, log, busy = false, choosing = false, error, onPlay, onDraw }: {
  game: 'whot' | 'ocho'; names: string[]; counts: number[]; hand: HandCard[]; seat: number | null;
  turn: number; winner: number | null; marketCount: number; topKey: string;
  topFace: ReactNode; backFace: ReactNode; match: ReactNode; log: string;
  busy?: boolean; choosing?: boolean; error?: string | null; onPlay: (i: number) => void; onDraw: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const copies = new Map<string, number>();
  const cards = hand.map(card => {
    const copy = copies.get(card.id) ?? 0;
    copies.set(card.id, copy + 1);
    return { ...card, key: `${card.id}:${copy}` };
  });
  useCardTableMotion(root, { game, names, counts, handKeys: cards.map(c => c.key), seat, turn, winner, topKey, log });
  const myTurn = seat !== null && seat === turn && winner === null;
  const enabled = myTurn && !busy && !choosing;
  const heading = winner !== null ? `${names[winner]} wins!` : seat === null ? 'Watching the table' : myTurn ? 'Your turn' : `${names[turn]}’s turn`;

  return <CampTable>
    <div ref={root} className="card-table" data-card-game={game} data-turn={turn} data-seat={seat ?? 'spectator'} data-winner={winner ?? ''} data-your-turn={myTurn}>
      <div className="card-table-kicker"><span>🔥 BY THE CAMPFIRE</span><span>{game.toUpperCase()} · CAMP DECK</span></div>
      <div className="card-opponents">
        {names.map((name, p) => p === seat ? null : <div key={p} className="card-opponent" data-player={p} data-active={turn === p && winner === null}>
          <div className="card-opponent-name">{name}</div>
          <div className="card-opponent-count">{counts[p]} {counts[p] === 1 ? 'card · LAST CARD!' : 'cards'}</div>
          <FannedHand count={counts[p]} name={name} backFace={backFace} />
        </div>)}
      </div>
      <div className="card-center">
        <button className="card-market" aria-label="Draw from market" disabled={!enabled} onClick={onDraw}>
          <div data-market-card><CardStack count={Math.max(1, marketCount)} backFace={backFace} /></div>
          <span className="card-market-caption">MARKET · {marketCount}</span>
          <span className="card-market-hint">{enabled ? 'Tap to draw' : 'Draw pile'}</span>
        </button>
        <div className="card-discard">
          <div className="card-pile" data-pile-card><Card width={84} height={122} backFace={backFace}>{topFace}</Card></div>
          <div className="card-match">{match}</div>
        </div>
      </div>
      <p className="card-log" role="status" aria-live="polite">{log}</p>
      <div className="card-player" data-player={seat ?? undefined}>
        <div className="card-hand-heading"><strong>{heading}</strong><span className="card-hand-count">{seat === null ? 'SPECTATOR' : `${hand.length} IN YOUR HAND${hand.length === 1 ? game === 'ocho' ? ' · OCHO!' : ' · LAST CARD!' : ''}`}</span></div>
        <div className="card-hand" aria-label="Your hand">
          {cards.map((card, i) => <button key={card.key} className="hand-card" data-hand-key={card.key} data-playable={card.playable} aria-label={`${card.label}${card.playable ? '' : ' — cannot play now'}`} disabled={!enabled || !card.playable} onClick={() => onPlay(i)}>
            <Card backFace={backFace} width={64} height={64 * 104 / 72} style={{ width: '100%', height: '100%' }}>{card.front}</Card>
          </button>)}
        </div>
        {hand.length === 0 && <div className="card-empty-hand">{seat === null ? 'A seat by the fire.' : winner === seat ? 'Every card played. Nicely done.' : 'The round is over.'}</div>}
        {hand.length > 0 && <p className="card-hand-tip">{winner !== null ? 'Round complete.' : busy ? 'Sending your move…' : myTurn ? 'Lit edges can play. Or tap the market.' : 'Your cards stay on the table. Hang tight.'}</p>}
      </div>
      {error && <p className="card-error" role="alert">{error}</p>}
      <div className="card-callout" data-last-card-callout aria-hidden="true" />
      <div className="card-winner-glow" data-winner-glow aria-hidden="true" />
    </div>
  </CampTable>;
}

export function CardChoice({ title, options, onChoose, onCancel }: {
  title: string; options: Array<{ value: string; label: string; icon?: ReactNode; color?: string }>;
  onChoose: (value: string) => void; onCancel: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const restore = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector('button')?.focus();
    return () => { if (restore?.isConnected) restore.focus(); };
  }, []);
  return <div className="card-choice-shade">
    <div ref={dialog} className="card-choice" role="dialog" aria-modal="true" aria-label={title} onKeyDown={e => {
      if (e.key === 'Escape') onCancel();
      if (e.key !== 'Tab') return;
      const buttons = Array.from(dialog.current?.querySelectorAll('button') ?? []);
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }}>
      <h2>{title}</h2><p>Pick what everyone plays next.</p>
      <div className="card-choice-options">{options.map(o => <button key={o.value} aria-label={`Choose ${o.label}`} onClick={() => onChoose(o.value)} style={o.color ? { borderLeft: `8px solid ${o.color}` } : undefined}>{o.icon}{o.label}</button>)}</div>
      <button className="card-choice-cancel" onClick={onCancel}>Back to my hand</button>
    </div>
  </div>;
}

export function GameTable({ opponents, center, player, tableVariant = 'felt', className = '' }: {
  opponents: Array<{ name: string; count: number; isActive?: boolean }>; center: ReactNode;
  player: ReactNode; tableVariant?: 'felt' | 'wood'; className?: string;
}) {
  return <CampTable variant={tableVariant} className={className}><div className="card-table"><div className="card-opponents">{opponents.map((o, i) => <div key={i} className="card-opponent" data-active={o.isActive}>{o.name} · {o.count}</div>)}</div><div className="card-center">{center}</div>{player}</div></CampTable>;
}