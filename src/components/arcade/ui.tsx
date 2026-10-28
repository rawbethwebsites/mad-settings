'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useResultSound } from '@/lib/useGameSounds';
import ShareCard from './ShareCard';

const VARIANTS = {
  primary: 'bg-brand-purple text-brand-cream',
  dark: 'bg-brand-black text-brand-cream',
  acid: 'bg-brand-acid text-brand-black',
  coral: 'bg-brand-coral text-brand-black',
  light: 'bg-white text-brand-black',
} as const;

export function Btn({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS }) {
  return (
    <button
      {...props}
      className={`py-3 px-4 poster-border font-display font-black uppercase text-sm disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
    />
  );
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`p-5 md:p-6 poster-border poster-shadow bg-white ${className}`}>{children}</div>;
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50 mb-2">{children}</div>
  );
}

export function Result({
  emoji,
  title,
  detail,
  points,
  tone,
  onAgain,
}: {
  emoji: string;
  title: string;
  detail?: string;
  points?: number;
  tone: 'win' | 'lose' | 'draw';
  onAgain: () => void;
}) {
  useResultSound(tone);
  const bg = tone === 'win' ? 'bg-brand-acid' : tone === 'lose' ? 'bg-brand-coral' : 'bg-brand-cyan';
  return (
    <div className={`mt-6 p-8 poster-border poster-shadow text-center text-brand-black ${bg}`}>
      <div className="text-6xl mb-3">{emoji}</div>
      <h2 className="font-display font-black text-3xl uppercase italic mb-2">{title}</h2>
      {detail && <p className="font-body text-lg mb-2">{detail}</p>}
      {!!points && points > 0 && <p className="font-display font-black text-xl mb-2">+{points} PTS</p>}
      <Btn variant="dark" onClick={onAgain} className="w-full mt-4">
        PLAY AGAIN →
      </Btn>
      <ShareCard result={{ tone, emoji, headline: title, detail, points }} />
    </div>
  );
}
