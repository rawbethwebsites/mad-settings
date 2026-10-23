'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { GAMES } from '@/data/games';

gsap.registerPlugin(ScrollTrigger);

// Frosted glass: the camp shows through, the words stay crisp
const glass = 'game-card flex items-center gap-3 min-h-16 px-4 py-3 rounded-2xl border border-white/25 bg-[#140f22]/45 md:bg-white/10 md:backdrop-blur-md text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:bg-white/20 transition-colors';

export default function GamesSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      // Cards stagger in from bottom with rotation
      gsap.from('.game-card', {
        y: 80,
        opacity: 0,
        rotation: -2,
        duration: 0.7,
        stagger: 0.15,
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
        ease: 'power3.out',
      });

      // The "READY?" block pops in last
      gsap.from('.game-cta-block', {
        scale: 0.85,
        opacity: 0,
        duration: 0.8,
        delay: 0.6,
        scrollTrigger: {
          trigger: '.game-cta-block',
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
        ease: 'back.out(1.4)',
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef}>
      {/* Every game campers can play, straight from the shared list */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" data-more-games>
        {GAMES.map(g => (
          <a key={g.id} href={g.path} className={glass}>
            <span className="text-2xl" aria-hidden="true">{g.emoji}</span>
            <span className="font-display font-black text-sm uppercase leading-tight [text-shadow:0_1px_6px_rgba(0,0,0,0.45)]">{g.name}</span>
          </a>
        ))}
        <a href="/casino" className={`${glass} col-span-2 sm:col-span-1 border-[#d4a017]/70 bg-[#0f3d2e]/45 text-[#f5d76e]`}>
          <span className="text-2xl" aria-hidden="true">🎰</span>
          <span className="font-display font-black text-sm uppercase leading-tight">Casino Night</span>
        </a>
      </div>

      <div className="game-cta-block md:col-span-2 mt-8 md:mt-12 text-center">
        <div className="inline-block p-6 md:p-12 poster-border poster-shadow bg-brand-purple text-brand-cream">
          <div className="font-display font-black text-3xl md:text-6xl uppercase italic mb-5 md:mb-6">
            READY? <br /> SCAN. JOIN. PLAY.
          </div>
          <a href="/join" id="join" className="inline-block px-6 py-4 md:px-10 md:py-5 bg-brand-cream text-brand-purple font-display font-black uppercase tracking-tighter text-lg md:text-2xl poster-border poster-shadow hover:-translate-y-1 transition-transform">
            ENTER GAME ROOM →
          </a>
        </div>
      </div>
    </div>
  );
}