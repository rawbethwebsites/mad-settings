'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function BonfireScene() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      // Flames flicker — scale + opacity loop
      gsap.to('.flame', {
        scaleY: 1.15,
        scaleX: 0.95,
        opacity: 0.85,
        duration: 0.4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        stagger: {
          amount: 0.6,
          from: 'center',
        },
      });

      // Embers float upward continuously
      gsap.to('.ember', {
        y: -120,
        x: 'random(-60, 60)',
        opacity: 0,
        scale: 0.3,
        duration: 'random(2, 5)',
        repeat: -1,
        stagger: {
          amount: 3,
          from: 'random',
        },
        ease: 'power1.out',
      });

      // Glow pulses
      gsap.to('.bonfire-glow', {
        scale: 1.15,
        opacity: 0.25,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Fire reacts to scroll — grows as you scroll into it
      gsap.fromTo('.flame-container', {
        scale: 0.8,
        opacity: 0.5,
      }, {
        scale: 1,
        opacity: 1,
        scrollTrigger: {
          trigger: sceneRef.current,
          start: 'top 80%',
          end: 'center center',
          scrub: 1.5,
        },
        ease: 'power2.out',
      });

      // Stars twinkle
      gsap.to('.bonfire-star', {
        opacity: 0.8,
        scale: 1.5,
        duration: 'random(1, 3)',
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        stagger: {
          amount: 2,
          from: 'random',
        },
      });
    }, sceneRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={sceneRef} className="relative w-full h-[60vh] flex items-center justify-center overflow-hidden">
      {/* Twinkling stars */}
      {[...Array(30)].map((_, i) => (
        <div
          key={`star-${i}`}
          className="bonfire-star absolute w-1 h-1 bg-brand-cream rounded-full"
          style={{
            left: `${(i * 37 + 11) % 100}%`,
            top: `${(i * 23 + 7) % 60}%`,
            opacity: 0.3,
          }}
        />
      ))}

      {/* Glow */}
      <div className="bonfire-glow absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at center, rgba(251,113,133,0.2), transparent 70%)' }} />

      {/* Flame System */}
      <div className="flame-container relative w-64 h-64 flex items-end justify-center">
        {/* Logs */}
        <div className="absolute bottom-0 w-48 h-8 bg-brand-black rounded-full rotate-3 z-20" />
        <div className="absolute bottom-0 w-48 h-8 bg-brand-black rounded-full -rotate-3 z-20" />

        {/* Flames — layered */}
        <div className="flame absolute bottom-4 w-32 h-48 bg-brand-coral rounded-full blur-xl opacity-60" style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }} />
        <div className="flame absolute bottom-4 w-24 h-40 bg-brand-purple rounded-full blur-lg opacity-80" style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }} />
        <div className="flame absolute bottom-4 w-16 h-32 bg-brand-acid rounded-full blur-sm opacity-90" style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }} />

        {/* Embers */}
        {[...Array(25)].map((_, i) => (
          <div
            key={`ember-${i}`}
            className="ember absolute bottom-8 w-1.5 h-1.5 bg-brand-acid rounded-full"
            style={{ left: `${(i * 41 + 13) % 100}%`, bottom: `${(i * 17 + 3) % 20}%` }}
          />
        ))}
      </div>
    </div>
  );
}