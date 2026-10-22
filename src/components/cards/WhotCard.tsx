'use client';

import type { CSSProperties } from 'react';
import { Card, CardStack } from './Card';
import type { Card as WhotCardType, Shape } from '@/lib/rules/whot';

export const ACTION_LABEL: Record<number, string> = { 1: 'HOLD ON', 2: 'PICK TWO', 5: 'PICK THREE', 8: 'SUSPEND', 14: 'GENERAL MARKET', 20: 'WHOT' };

export function ShapeIcon({ shape, size = 24, color = 'currentColor' }: { shape: Shape | 'whot'; size?: number; color?: string }) {
  const paths: Record<Shape | 'whot', React.ReactNode> = {
    circle: <circle cx="12" cy="12" r="10" />,
    triangle: <path d="M12 2 23 22H1Z" />,
    cross: <path d="M8 1h8v7h7v8h-7v7H8v-7H1V8h7Z" />,
    square: <rect x="2" y="2" width="20" height="20" rx="1" />,
    star: <path d="m12 1 3.4 7 7.6 1.1-5.5 5.4 1.3 7.5-6.8-3.6L5.2 22l1.3-7.5L1 9.1 8.6 8Z" />,
    whot: <text x="12" y="18" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="bold" fontSize="23">W</text>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true" style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }}>{paths[shape]}</svg>;
}

export function WhotBack() {
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '7%', background: 'repeating-linear-gradient(45deg, #8b302e 0 2px, #702625 2px 5px)', color: '#fff0d1' }}>
      <div style={{ height: '100%', border: '1px solid #dfb784', borderRadius: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8%' }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: '23cqw', fontWeight: 900, fontStyle: 'italic' }}>Whot!</span>
        <span style={{ fontSize: '8cqw', letterSpacing: '0.13em' }}>CAMP DECK</span>
      </div>
    </div>
  );
}

export function WhotFront({ card, size = 'md' }: { card: WhotCardType; size?: 'sm' | 'md' | 'lg' }) {
  const corner: CSSProperties = { position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, fontSize: '23cqw', lineHeight: 1, fontWeight: 900 };
  const index = <><span data-card-index>{card.n}</span><span style={{ width: '15cqw', height: '15cqw' }}><ShapeIcon shape={card.shape} size={32} /></span></>;
  return (
    <div data-whot-shape={card.shape} data-whot-number={card.n} data-size={size} style={{ position: 'absolute', inset: 0, color: '#722b2a', fontFamily: 'Georgia, serif' }}>
      <div style={{ ...corner, top: '6%', left: '7%' }}>{index}</div>
      <div style={{ ...corner, bottom: '6%', right: '7%', transform: 'rotate(180deg)' }}>{index}</div>
      <div style={{ position: 'absolute', inset: '23% 15%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5cqw' }}>
        {card.shape === 'whot'
          ? <span style={{ fontSize: '24cqw', fontStyle: 'italic', fontWeight: 900 }}>Whot!</span>
          : <span style={{ width: '39cqw', height: '39cqw' }}><ShapeIcon shape={card.shape} size={80} /></span>}
        <strong style={{ fontSize: '29cqw', lineHeight: 1 }}>{card.n}</strong>
      </div>
    </div>
  );
}

export function WhotCard({ card, isFlipped = false, playable = true, onClick, className = '', style, size = 'md' }: {
  card: WhotCardType; isFlipped?: boolean; playable?: boolean; onClick?: () => void;
  className?: string; style?: CSSProperties; size?: 'sm' | 'md' | 'lg';
}) {
  const width = size === 'sm' ? 64 : size === 'lg' ? 84 : 72;
  return <Card backFace={<WhotBack />} isFlipped={isFlipped} width={width} height={width * 104 / 72} onClick={onClick} className={className} style={{ opacity: playable ? 1 : 0.66, ...style }}><WhotFront card={card} size={size} /></Card>;
}

export function WhotHand({ hand, canPlayCard, onCardPlay, disabled = false, className = '' }: {
  hand: WhotCardType[]; canPlayCard: (card: WhotCardType) => boolean; onCardPlay: (i: number) => void; disabled?: boolean; className?: string;
}) {
  return <div className={className} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 7 }}>
    {hand.map((card, i) => <button key={i} aria-label={`${card.shape} ${card.n}`} disabled={disabled || !canPlayCard(card)} onClick={() => onCardPlay(i)} style={{ padding: 0, border: 0, background: 'none' }}><WhotCard card={card} playable={canPlayCard(card)} size="sm" /></button>)}
  </div>;
}

export function WhotMarket({ count, onDraw, disabled = false, className = '' }: { count: number; onDraw: () => void; disabled?: boolean; className?: string }) {
  return <button className={className} disabled={disabled} onClick={onDraw} aria-label="Draw from market" style={{ padding: 0, background: 'none', border: 0, color: '#ffedcf' }}><CardStack count={Math.max(1, count)} backFace={<WhotBack />} /><span style={{ display: 'block', fontSize: 10, marginTop: 8 }}>MARKET · {count}</span></button>;
}