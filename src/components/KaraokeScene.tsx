'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function KaraokeScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      // "SING IT LOUD" text reveal — each letter pops
      gsap.from('.karaoke-letter', {
        y: 60,
        opacity: 0,
        rotation: -10,
        duration: 0.5,
        stagger: 0.05,
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 75%',
          toggleActions: 'play none none reverse',
        },
        ease: 'back.out(1.5)',
      });

      // Waveform bars animate on scroll into view
      gsap.from('.wave-bar', {
        scaleY: 0,
        opacity: 0,
        duration: 0.4,
        stagger: 0.03,
        scrollTrigger: {
          trigger: '.karaoke-wave',
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
        ease: 'power2.out',
      });

      // Floating music notes drift upward
      gsap.to('.music-note', {
        y: -60,
        rotation: 'random(-20, 20)',
        opacity: 0.3,
        duration: 'random(3, 5)',
        repeat: -1,
        yoyo: true,
        stagger: {
          amount: 2,
          from: 'random',
        },
        ease: 'sine.inOut',
      });

      // Diagonal bars slide across
      gsap.to('.karaoke-bar-1', {
        x: 200,
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
        },
      });
      gsap.to('.karaoke-bar-2', {
        x: -200,
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
        },
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const letters = 'SING IT LOUD'.split('');

  return (
    <div ref={containerRef} className="relative py-20 text-center overflow-hidden">
      {/* Animated diagonal bars */}
      <div className="karaoke-bar-1 absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <div className="w-full h-24 bg-brand-purple rotate-12 translate-x-1/2" />
      </div>
      <div className="karaoke-bar-2 absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <div className="w-full h-24 bg-brand-acid -rotate-12 -translate-x-1/2" />
      </div>

      {/* Floating music notes */}
      <div className="music-note absolute top-[10%] left-[15%] text-4xl text-brand-purple/30">♪</div>
      <div className="music-note absolute top-[20%] right-[20%] text-3xl text-brand-acid/30">♫</div>
      <div className="music-note absolute bottom-[15%] left-[25%] text-2xl text-brand-coral/30">♪</div>
      <div className="music-note absolute bottom-[25%] right-[15%] text-4xl text-brand-cyan/30">♫</div>
      <div className="music-note absolute top-[40%] left-[60%] text-3xl text-brand-purple/20">♪</div>

      {/* Letters */}
      <div className="relative z-10 font-display font-black text-6xl md:text-8xl uppercase italic leading-none flex justify-center flex-wrap gap-1">
        {letters.map((letter, i) => (
          <span key={i} className="karaoke-letter inline-block">
            {letter === ' ' ? '\u00A0' : letter}
          </span>
        ))}
      </div>

      {/* Waveform */}
      <div className="karaoke-wave relative z-10 mt-12 flex items-center justify-center gap-1 h-24">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="wave-bar w-2 bg-brand-purple rounded-full"
            style={{
              height: `${20 + Math.abs(Math.sin(i * 0.5)) * 60}px`,
              animationDelay: `${i * 0.05}s`,
              animationDuration: `${0.6 + (i % 4) * 0.15}s`,
            }}
          />
        ))}
      </div>

      {/* Mic icon */}
      <div className="relative z-10 mt-8 text-6xl animate-float-medium">🎤</div>
    </div>
  );
}