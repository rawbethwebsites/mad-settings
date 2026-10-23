'use client';

import { useEffect, useState } from 'react';
import { useCountdownSounds } from '@/lib/useGameSounds';

export default function TurnCountdown({ deadline, serverNow, duration, label, round, seat }: {
  deadline: number;
  serverNow: number;
  duration: number;
  label: string;
  round: string;
  seat: number;
}) {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((deadline - serverNow) / 1000)));
  useEffect(() => {
    // Anchor each fresh server snapshot to this phone's wall clock. A phone
    // clock several minutes fast/slow must still show the server's deadline.
    const offset = serverNow - Date.now();
    const update = () => setLeft(Math.max(0, Math.ceil((deadline - (Date.now() + offset)) / 1000)));
    const first = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 100);
    const onVisible = () => { if (document.visibilityState === 'visible') update(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [deadline, serverNow]);
  useCountdownSounds(left, round);

  const fraction = Math.min(1, left / duration);
  const urgent = left <= 3;
  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={left > 0 ? `${label} · ${left}s` : 'Ran out of time · waiting for the server'}
      data-active-seat={seat}
      data-seconds={left}
      className={`flex items-center gap-3 p-3 mb-4 poster-border ${urgent ? 'bg-brand-coral' : 'bg-brand-acid'}`}
    >
      <div className="relative w-11 h-11 shrink-0" aria-hidden="true">
        <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90">
          <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="4" />
          <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="4" pathLength="1"
            strokeDasharray="1" strokeDashoffset={1 - fraction} className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-100" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display font-black text-sm">{left}</span>
      </div>
      <p className="font-display font-black text-sm min-w-0 break-words">
        {left > 0 ? `${label} · ${left}s` : 'Ran out of time'}
        {left === 0 && <span className="block font-body font-normal text-xs">Waiting for the server…</span>}
      </p>
    </div>
  );
}
