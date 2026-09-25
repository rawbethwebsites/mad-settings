'use client';

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

const STAGES = ['ARRIVE', 'PLAY', 'SING', 'FIRE', 'CHILL', 'MORNING', 'GO HOME'];

export default function ScrollProgress() {
  const [activeStage, setActiveStage] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      const stage = Math.min(Math.floor(scrollPercent * STAGES.length), STAGES.length - 1);
      setActiveStage(stage);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-4 font-display font-bold text-[10px] tracking-widest uppercase"
    >
      {STAGES.map((stage, i) => (
        <div key={stage} className="flex items-center gap-3 group cursor-pointer">
          <div className={cn(
            "w-2 h-2 rounded-full transition-all duration-500",
            i === activeStage
              ? "bg-brand-purple scale-[2.2]"
              : i < activeStage
                ? "bg-brand-purple/40"
                : "bg-brand-black/20 group-hover:bg-brand-black/50"
          )} />
          <span className={cn(
            "transition-all duration-500",
            i === activeStage
              ? "text-brand-purple font-black scale-125"
              : i < activeStage
                ? "text-brand-purple/40"
                : "text-brand-black/40"
          )}>
            {stage}
          </span>
        </div>
      ))}
    </div>
  );
}