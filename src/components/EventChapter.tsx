'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger);

interface ChapterProps {
  id: string;
  time: string;
  headline: string;
  subheadline?: string;
  children: React.ReactNode;
  bgColor?: string;
  textColor?: string;
  className?: string;
}

export default function EventChapter({ id, time, headline, subheadline, children, bgColor = 'bg-brand-cream', textColor = 'text-brand-black', className }: ChapterProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      if (reduced) return;

      // Time stamp slides in from left
      gsap.from('.chapter-time', {
        x: -60,
        opacity: 0,
        duration: 0.8,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          toggleActions: 'play none none reverse',
        },
        ease: 'power3.out',
      });

      // Headline words reveal one by one
      const words = headline.split(' ');
      gsap.from('.chapter-headline-word', {
        y: 80,
        opacity: 0,
        rotation: -5,
        duration: 0.6,
        stagger: 0.08,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
          toggleActions: 'play none none reverse',
        },
        ease: 'power4.out',
      });

      // Subheadline slides in
      if (subheadline) {
        gsap.from('.chapter-subheadline', {
          x: -30,
          opacity: 0,
          duration: 0.8,
          delay: 0.3,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
          ease: 'power3.out',
        });
      }

      // Content fades up
      gsap.from('.chapter-body > *', {
        y: 40,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        delay: 0.4,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 65%',
          toggleActions: 'play none none reverse',
        },
        ease: 'power3.out',
      });

      // Background parallax shift
      gsap.to(sectionRef.current, {
        backgroundPositionY: '20%',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, [headline, subheadline]);

  const words = headline.split(' ');

  return (
    <section
      id={id}
      ref={sectionRef}
      className={cn(
        "relative min-h-screen w-full py-24 px-6 flex flex-col justify-center transition-colors duration-700 overflow-hidden",
        bgColor, textColor, className
      )}
    >
      <div className="max-w-5xl mx-auto w-full relative z-10">
        <div className="chapter-time font-display font-black text-2xl md:text-4xl mb-4 opacity-60">
          {time}
        </div>
        <h2 className="font-display font-black text-6xl md:text-9xl uppercase italic leading-none mb-6 flex flex-wrap gap-x-4">
          {words.map((word, i) => (
            <span key={i} className="chapter-headline-word inline-block">
              {word}
            </span>
          ))}
        </h2>
        {subheadline && (
          <div className="chapter-subheadline font-display font-bold text-xl md:text-2xl uppercase tracking-widest mb-12 border-l-8 border-brand-purple pl-4">
            {subheadline}
          </div>
        )}
        <div className="chapter-body relative">
          {children}
        </div>
      </div>
    </section>
  );
}