'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { schedule } from '@/data/schedule';

gsap.registerPlugin(ScrollTrigger);

export default function ProgramTimeline() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      // Title slides in
      gsap.from('.program-title', {
        y: 60,
        opacity: 0,
        duration: 0.8,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          toggleActions: 'play none none reverse',
        },
        ease: 'power3.out',
      });

      // Timeline items reveal one by one
      gsap.from('.timeline-item', {
        x: -40,
        opacity: 0,
        duration: 0.5,
        stagger: 0.08,
        scrollTrigger: {
          trigger: '.timeline-list',
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
        ease: 'power3.out',
      });

      // Timeline dots scale in
      gsap.from('.timeline-dot', {
        scale: 0,
        duration: 0.4,
        stagger: 0.08,
        scrollTrigger: {
          trigger: '.timeline-list',
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
        ease: 'back.out(2)',
      });

      // Vertical line draws itself
      gsap.from('.timeline-line', {
        scaleY: 0,
        transformOrigin: 'top',
        duration: 1.5,
        scrollTrigger: {
          trigger: '.timeline-list',
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
        ease: 'power2.out',
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="program" ref={sectionRef} className="py-24 px-6 bg-brand-black text-brand-cream overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <h2 className="program-title font-display font-black text-5xl md:text-7xl uppercase italic mb-16 text-center">
          PROGRAM OF EVENTS
        </h2>
        <div className="timeline-list relative">
          {/* Vertical line */}
          <div className="timeline-line absolute left-0 top-0 bottom-0 w-1 bg-brand-purple" />

          <div className="space-y-0 pl-8">
            {schedule.map((event) => (
              <div key={event.id} className="timeline-item mb-12 relative group">
                <div className="timeline-dot absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-brand-purple border-4 border-brand-black group-hover:scale-150 transition-transform" />
                <div className="font-display font-bold text-sm uppercase tracking-widest text-brand-acid mb-1">
                  {event.time}
                </div>
                <div className="font-display font-black text-2xl md:text-4xl uppercase italic mb-2">
                  {event.title}
                </div>
                {event.description && (
                  <div className="font-body text-lg opacity-70">{event.description}</div>
                )}
                {event.detail && (
                  <div className="font-display font-bold text-sm uppercase text-brand-coral">{event.detail}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}