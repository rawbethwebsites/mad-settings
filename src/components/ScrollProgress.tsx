'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { NIGHT_STAGES } from '@/data/campWorld';

export default function ScrollProgress() {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const stage = Math.min(Math.floor(scrollPercent * NIGHT_STAGES.length), NIGHT_STAGES.length - 1);
      setActiveStage(stage);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav
        aria-label="Camp night stages"
        className="fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-3 font-display font-bold text-[10px] tracking-widest uppercase"
      >
        {NIGHT_STAGES.map((stage, i) => (
          <a
            key={stage.id}
            href={stage.href}
            className="flex items-center gap-3 group min-h-11"
          >
            <span
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all duration-500",
                i === activeStage
                  ? "bg-brand-acid scale-[1.8]"
                  : i < activeStage
                    ? "bg-brand-purple/70"
                    : "bg-brand-cream/30 group-hover:bg-brand-cream/70"
              )}
            />
            <span
              className={cn(
                "transition-all duration-500",
                i === activeStage
                  ? "text-brand-acid font-black"
                  : i < activeStage
                    ? "text-brand-cream/70"
                    : "text-brand-cream/40 group-hover:text-brand-cream"
              )}
            >
              {stage.label}
            </span>
          </a>
        ))}
      </nav>

      <nav
        aria-label="Jump the night"
        className="night-rail md:hidden"
      >
        {NIGHT_STAGES.map((stage, i) => (
          <a
            key={stage.id}
            href={stage.href}
            className={cn(
              "night-rail-chip",
              i === activeStage && "night-rail-chip-active"
            )}
          >
            {stage.label}
          </a>
        ))}
      </nav>
    </>
  );
}
