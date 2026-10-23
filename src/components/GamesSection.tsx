'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { games, GAMES } from '@/data/games';

gsap.registerPlugin(ScrollTrigger);

// Every other game, so the homepage always matches what campers can actually play
const FEATURED = new Set(games.map(g => g.path));
const MORE = GAMES.filter(g => !FEATURED.has(g.path));

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

      // Number badges float
      gsap.to('.game-number', {
        y: -10,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        stagger: 0.3,
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {games.map((game) => (
        <a
          key={game.id}
          href={game.path}
          className="game-card group relative p-8 poster-border poster-shadow bg-brand-cream text-brand-black transition-all hover:-translate-y-2 hover:-translate-x-2 overflow-hidden block"
        >
          <div className="game-number absolute top-0 right-0 font-display font-black text-8xl opacity-10 group-hover:opacity-20 transition-opacity leading-none">
            {game.number}
          </div>

          <div className="relative z-10">
            <h3 className="font-display font-black text-3xl md:text-5xl uppercase italic mb-2 group-hover:text-brand-purple transition-colors">
              {game.name}
            </h3>
            <div className="font-display font-bold text-lg uppercase tracking-tighter mb-4 text-brand-black/60">
              {game.tagline}
            </div>
            <p className="font-body text-lg leading-relaxed mb-6 max-w-sm">
              {game.description}
            </p>
            <div className="inline-block px-4 py-2 bg-brand-black text-brand-cream font-display font-bold text-xs uppercase tracking-widest group-hover:bg-brand-purple transition-colors">
              Enter Game
            </div>
          </div>
        </a>
      ))}

      <div className="md:col-span-2" data-more-games>
        <h3 className="font-display font-black text-2xl md:text-3xl uppercase italic mb-4">
          Plus {MORE.length} more games
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {MORE.map(g => (
            <a key={g.id} href={g.path} className="game-card flex items-center gap-2 min-h-14 p-3 poster-border bg-brand-cream text-brand-black hover:bg-brand-acid transition-colors">
              <span className="text-2xl" aria-hidden="true">{g.emoji}</span>
              <span className="font-display font-black text-sm uppercase leading-tight">{g.name}</span>
            </a>
          ))}
          <a href="/casino" className="game-card col-span-2 sm:col-span-1 flex items-center gap-2 min-h-14 p-3 border-4 border-[#d4a017] bg-[#0f3d2e] text-[#f5d76e]">
            <span className="text-2xl" aria-hidden="true">🎰</span>
            <span className="font-display font-black text-sm uppercase leading-tight">Casino Night</span>
          </a>
        </div>
      </div>

      <div className="game-cta-block md:col-span-2 mt-12 text-center">
        <div className="inline-block p-12 poster-border poster-shadow bg-brand-purple text-brand-cream">
          <div className="font-display font-black text-4xl md:text-6xl uppercase italic mb-6">
            READY? <br /> SCAN. JOIN. PLAY.
          </div>
          <a href="/join" id="join" className="inline-block px-10 py-5 bg-brand-cream text-brand-purple font-display font-black uppercase tracking-tighter text-2xl poster-border poster-shadow hover:-translate-y-1 transition-transform">
            ENTER GAME ROOM →
          </a>
        </div>
      </div>
    </div>
  );
}