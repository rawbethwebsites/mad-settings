'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      // Staggered title reveal — each letter slides up
      gsap.from('.hero-title span', {
        y: 120,
        opacity: 0,
        duration: 1.2,
        stagger: 0.15,
        ease: 'power4.out',
        delay: 0.2,
      });

      // Subtitle fades in
      gsap.from('.hero-subtitle', {
        y: 20,
        opacity: 0,
        duration: 0.8,
        delay: 0.8,
        ease: 'power2.out',
      });

      // Headline words pop in
      gsap.from('.hero-headline', {
        scale: 0.8,
        opacity: 0,
        duration: 1,
        delay: 1,
        ease: 'back.out(1.7)',
      });

      // Supporting copy
      gsap.from('.hero-copy', {
        y: 20,
        opacity: 0,
        duration: 0.8,
        delay: 1.2,
        stagger: 0.1,
        ease: 'power2.out',
      });

      // Buttons slide up
      gsap.from('.hero-btn', {
        y: 30,
        opacity: 0,
        duration: 0.6,
        delay: 1.4,
        stagger: 0.15,
        ease: 'power3.out',
      });

      // Scroll indicator
      gsap.from('.scroll-indicator', {
        opacity: 0,
        duration: 1,
        delay: 2,
        ease: 'power2.out',
      });

      // Parallax background elements on scroll
      gsap.to('.hero-bg-shape', {
        y: (i: number) => -80 - i * 40,
        rotation: (i: number) => i * 15,
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1.5,
        },
      });

      // Grid moves slower (depth)
      gsap.to('.hero-grid', {
        y: -30,
        opacity: 0.02,
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      // Title scales and fades on scroll
      gsap.to('.hero-title', {
        scale: 0.85,
        opacity: 0.3,
        y: -100,
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: '60% top',
          scrub: true,
        },
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-brand-cream">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="hero-bg-shape absolute top-[15%] left-[8%] w-32 h-32 bg-brand-purple/10 rounded-full blur-3xl animate-float-slow" />
        <div className="hero-bg-shape absolute bottom-[20%] right-[8%] w-64 h-64 bg-brand-acid/20 rounded-full blur-3xl animate-float-medium" />
        <div className="hero-bg-shape absolute top-[30%] right-[25%] w-20 h-20 border-4 border-brand-black rotate-12 animate-float-fast" />
        <div className="hero-bg-shape absolute bottom-[30%] left-[25%] w-16 h-16 bg-brand-coral opacity-30 rotate-45 animate-spin-slow" />
        <div className="hero-bg-shape absolute top-[50%] left-[5%] w-12 h-12 bg-brand-cyan/30 rounded-full animate-float-slow" />
        <div className="hero-bg-shape absolute top-[70%] right-[15%] w-10 h-10 border-4 border-brand-purple rotate-45 animate-float-medium" />

        {/* Star/sparkle dots */}
        <div className="hero-bg-shape absolute top-[20%] right-[10%] w-2 h-2 bg-brand-black rounded-full animate-pulse-glow" />
        <div className="hero-bg-shape absolute top-[60%] left-[15%] w-2 h-2 bg-brand-purple rounded-full animate-pulse-glow" />
        <div className="hero-bg-shape absolute bottom-[15%] right-[30%] w-3 h-3 bg-brand-coral rounded-full animate-pulse-glow" />

        {/* Grid Lines */}
        <div className="hero-grid absolute inset-0 opacity-10"
             style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                      backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10 text-center px-6">
        <div className="hero-title flex flex-col items-center font-display font-black leading-none uppercase italic">
          <span className="text-7xl md:text-9xl text-brand-black">MAD</span>
          <span className="text-7xl md:text-9xl text-brand-purple -mt-4 md:-mt-8">SETT</span>
          <span className="text-7xl md:text-9xl text-brand-black -mt-4 md:-mt-8">INGS</span>
        </div>

        <div className="hero-subtitle mt-6 font-display font-bold tracking-widest text-sm md:text-lg uppercase text-brand-black/60">
          POP-UP • BONFIRE • SLEEPOVER
        </div>

        <h2 className="hero-headline mt-12 font-display font-black text-4xl md:text-6xl uppercase leading-tight max-w-2xl mx-auto">
          ONE NIGHT.<br />
          <span className="text-brand-purple">ZERO CHILL.</span>
        </h2>

        <p className="hero-copy mt-6 font-body text-lg md:text-xl text-brand-black/70 max-w-md mx-auto">
          Come for the vibe.<br />
          Stay for the games.
        </p>

        <div className="mt-10 flex flex-col md:flex-row gap-4 justify-center items-center">
          <a href="#join" className="hero-btn group relative px-8 py-4 bg-brand-purple text-brand-cream font-display font-black uppercase tracking-tighter text-xl poster-border poster-shadow transition-all hover:-translate-y-1 hover:-translate-x-1 active:translate-y-0 active:translate-x-0">
            JOIN THE GAMES
            <span className="inline-block transition-transform group-hover:translate-x-2 ml-2">→</span>
          </a>
          <a href="#program" className="hero-btn px-8 py-4 bg-brand-cream text-brand-black font-display font-black uppercase tracking-tighter text-xl poster-border poster-shadow transition-all hover:-translate-y-1 hover:-translate-x-1 active:translate-y-0 active:translate-x-0">
            VIEW PROGRAM
          </a>
        </div>

        <div className="scroll-indicator absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 font-display font-bold text-xs uppercase tracking-widest text-brand-black/40 animate-bounce-arrow">
          SCROLL TO ENTER
          <span className="text-lg">↓</span>
        </div>
      </div>
    </section>
  );
}