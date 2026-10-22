'use client';

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { gsap } from 'gsap';

interface CardProps {
  children: ReactNode;
  backFace: ReactNode;
  isFlipped?: boolean;
  onFlipComplete?: () => void;
  className?: string;
  style?: CSSProperties;
  width?: number;
  height?: number;
  onClick?: () => void;
}

const CARD_ASPECT = 72 / 104;

// CSS 3D keeps the lettering sharp without a WebGL canvas per card.
export function HTMLCard({
  children, backFace, isFlipped = false, onFlipComplete,
  className = '', style, width = 72, height = 104, onClick,
}: CardProps) {
  const rotator = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const animation = gsap.to(rotator.current, {
      rotationY: isFlipped ? 180 : 0,
      duration: reduced.matches ? 0 : 0.4,
      ease: 'power2.inOut',
      onComplete: onFlipComplete,
    });
    const finish = () => { if (reduced.matches) animation.progress(1); };
    reduced.addEventListener('change', finish);
    return () => { animation.kill(); reduced.removeEventListener('change', finish); };
  }, [isFlipped, onFlipComplete]);

  const face: CSSProperties = {
    position: 'absolute', inset: 0, borderRadius: 7, overflow: 'hidden',
    backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
    border: '1px solid #e5d5b9',
    boxShadow: '0 3px 6px #160d0840, inset 0 1px 0 #ffffff90',
  };

  return (
    <div data-card className={className} onClick={onClick}
      style={{ position: 'relative', width, height, maxWidth: '100%', perspective: 800, containerType: 'inline-size', ...style }}>
      <div ref={rotator} data-card-rotator style={{ width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
        <div data-card-front style={{ ...face, background: 'linear-gradient(130deg, #fffcf2, #efe3cb)', transform: 'translateZ(0.1px)' }}>
          {children}
        </div>
        <div data-card-back style={{ ...face, transform: 'rotateY(180deg) translateZ(0.1px)' }}>
          {backFace}
        </div>
      </div>
    </div>
  );
}

export const Card = HTMLCard;

export function CardStack({
  count, backFace, className = '', style, width = 72, height = 104,
  maxVisible = 4, rotationVariance = 3, offsetStep = 1.5,
}: {
  count: number; backFace: ReactNode; className?: string; style?: CSSProperties;
  width?: number; height?: number; maxVisible?: number; rotationVariance?: number; offsetStep?: number;
}) {
  const visible = Math.min(count, maxVisible);
  return (
    <div className={className} style={{ position: 'relative', width, height, ...style }}>
      {Array.from({ length: visible }, (_, i) => (
        <div key={i} style={{ position: 'absolute', inset: 0, transform: `translate(${i * 0.5}px, ${i * offsetStep}px) rotate(${i % 2 ? rotationVariance : -rotationVariance}deg)` }}>
          <Card backFace={backFace} isFlipped width={width} height={height}>{null}</Card>
        </div>
      ))}
    </div>
  );
}

export function DiscardPile({
  cards, backFace, className = '', style, width = 84, height = 122, maxVisible = 3,
}: {
  cards: Array<{ front: ReactNode; back: ReactNode }>; backFace: ReactNode;
  className?: string; style?: CSSProperties; width?: number; height?: number; maxVisible?: number;
}) {
  return (
    <div className={className} style={{ position: 'relative', width, height, ...style }}>
      {cards.slice(-maxVisible).map((card, i) => (
        <div key={i} style={{ position: 'absolute', inset: 0, transform: `rotate(${i % 2 ? 3 : -2}deg)` }}>
          <Card backFace={card.back ?? backFace} width={width} height={height}>{card.front}</Card>
        </div>
      ))}
    </div>
  );
}

export function FannedHand({
  count, name, backFace, className = '', style, cardWidth = 28, fanAngle = 30, maxVisible = 5,
}: {
  count: number; name: string; backFace: ReactNode; className?: string; style?: CSSProperties;
  cardWidth?: number; fanAngle?: number; maxVisible?: number;
}) {
  const visible = Math.min(count, maxVisible);
  return (
    <div className={className} aria-label={`${name}, ${count} cards`} style={{ position: 'relative', height: cardWidth / CARD_ASPECT + 8, width: '100%', ...style }}>
      {Array.from({ length: visible }, (_, i) => {
        const offset = i - (visible - 1) / 2;
        return (
          <div key={i} data-back-card style={{ position: 'absolute', left: '50%', top: 3, width: cardWidth, height: cardWidth / CARD_ASPECT, transform: `translateX(calc(-50% + ${offset * 10}px)) rotate(${visible === 1 ? 0 : offset * fanAngle / (visible - 1)}deg)` }}>
            <Card isFlipped backFace={backFace} width={cardWidth} height={cardWidth / CARD_ASPECT}>{null}</Card>
          </div>
        );
      })}
    </div>
  );
}

export { CARD_ASPECT };