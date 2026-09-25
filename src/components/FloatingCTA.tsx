'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function FloatingCTA() {
  const ctaRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    // Slide in after scrolling past hero
    const ctx = gsap.context(() => {
      gsap.fromTo(ctaRef.current, {
        y: 100,
        opacity: 0,
      }, {
        y: 0,
        opacity: 1,
        scrollTrigger: {
          trigger: ctaRef.current,
          start: 'top bottom',
          toggleActions: 'play none none reverse',
        },
        ease: 'power3.out',
        duration: 0.5,
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <a
      ref={ctaRef}
      href="#join"
      className="mobile-cta"
      aria-label="Join the games"
    >
      🔥 JOIN GAME
    </a>
  );
}