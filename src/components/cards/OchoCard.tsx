'use client';

import type { CSSProperties } from 'react';
import { Card, CardStack } from './Card';
import type { Card as OchoCardType, Color } from '@/lib/rules/ocho';

export const COLOUR: Record<Color, string> = { red: '#b63c35', yellow: '#dfac31', green: '#377654', blue: '#366f9b' };
export const KIND_LABEL: Record<string, string> = { reverse: 'REVERSE', skip: 'SKIP', draw2: 'PICK TWO', wild: 'WILD', wild4: 'PICK FOUR' };
export const KIND_GLYPH: Record<string, string> = { reverse: '⇄', skip: '⊘', draw2: '+2', wild: 'W', wild4: '+4' };

export function OchoBack() {
  return <div style={{ position: 'absolute', inset: 0, padding: '7%', color: '#fff2d3', background: 'repeating-linear-gradient(135deg, #63382b 0 2px, #542f26 2px 5px)' }}>
    <div style={{ height: '100%', border: '1px solid #d4ac78', borderRadius: 3, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '8%' }}>
      <span style={{ fontSize: '23cqw', fontWeight: 950, fontStyle: 'italic', transform: 'rotate(-12deg)' }}>OCHO!</span>
      <span style={{ fontSize: '8cqw', letterSpacing: '0.13em' }}>CAMP DECK</span>
    </div>
  </div>;
}

export function OchoFront({ card, size = 'md' }: { card: OchoCardType; size?: 'sm' | 'md' | 'lg' }) {
  const colour = card.color ? COLOUR[card.color] : '#5c453d';
  const ink = card.color === 'yellow' ? '#3c2d1d' : '#fff8e9';
  const label = card.kind === 'num' ? String(card.n) : KIND_GLYPH[card.kind];
  const corner: CSSProperties = { position: 'absolute', fontSize: '23cqw', fontWeight: 950, lineHeight: 1, color: ink };
  return <div data-ocho-colour={card.color ?? 'wild'} data-ocho-kind={card.kind} data-ocho-number={card.n} data-size={size} style={{ position: 'absolute', inset: '4%', borderRadius: 4, overflow: 'hidden', background: colour, fontFamily: 'Arial, sans-serif' }}>
    <div style={{ ...corner, left: '5%', top: '5%' }} data-card-index>{label}</div>
    <div style={{ ...corner, right: '5%', bottom: '5%', transform: 'rotate(180deg)' }} data-card-index>{label}</div>
    <div style={{ position: 'absolute', inset: '20% 10%', borderRadius: '50%', transform: 'rotate(-24deg)', background: card.color ? '#fff5de' : 'conic-gradient(#b63c35 0 25%, #dfac31 25% 50%, #377654 50% 75%, #366f9b 75%)', display: 'grid', placeItems: 'center' }}>
      <strong style={{ display: 'block', fontSize: label.length > 1 ? '37cqw' : '52cqw', lineHeight: 1, color: card.color ? colour : '#fff8e9', transform: 'rotate(24deg)', textShadow: card.color ? 'none' : '0 1px 3px #20100880' }}>{label}</strong>
    </div>
    {card.kind !== 'num' && <span style={{ position: 'absolute', bottom: '7%', left: '6%', fontSize: '8cqw', fontWeight: 800, color: ink }}>{KIND_LABEL[card.kind]}</span>}
  </div>;
}

export function OchoCard({ card, isFlipped = false, playable = true, onClick, className = '', style, size = 'md' }: {
  card: OchoCardType; isFlipped?: boolean; playable?: boolean; onClick?: () => void;
  className?: string; style?: CSSProperties; size?: 'sm' | 'md' | 'lg';
}) {
  const width = size === 'sm' ? 64 : size === 'lg' ? 84 : 72;
  return <Card backFace={<OchoBack />} isFlipped={isFlipped} width={width} height={width * 104 / 72} onClick={onClick} className={className} style={{ opacity: playable ? 1 : 0.66, ...style }}><OchoFront card={card} size={size} /></Card>;
}

export function OchoHand({ hand, canPlayCard, onCardPlay, disabled = false, className = '' }: {
  hand: OchoCardType[]; canPlayCard: (card: OchoCardType) => boolean; onCardPlay: (i: number) => void; disabled?: boolean; className?: string;
}) {
  return <div className={className} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 7 }}>
    {hand.map((card, i) => <button key={i} aria-label={`${card.color ?? 'wild'} ${card.kind === 'num' ? card.n : KIND_LABEL[card.kind]}`} disabled={disabled || !canPlayCard(card)} onClick={() => onCardPlay(i)} style={{ padding: 0, border: 0, background: 'none' }}><OchoCard card={card} playable={canPlayCard(card)} size="sm" /></button>)}
  </div>;
}

export function OchoMarket({ count, onDraw, disabled = false, className = '' }: { count: number; onDraw: () => void; disabled?: boolean; className?: string }) {
  return <button className={className} disabled={disabled} onClick={onDraw} aria-label="Draw from market" style={{ padding: 0, background: 'none', border: 0, color: '#ffedcf' }}><CardStack count={Math.max(1, count)} backFace={<OchoBack />} /><span style={{ display: 'block', fontSize: 10, marginTop: 8 }}>MARKET · {count}</span></button>;
}