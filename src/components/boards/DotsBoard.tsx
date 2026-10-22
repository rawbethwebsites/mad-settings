'use client';

import { useReducedMotion } from '@/components/three/useReducedMotion';
import type { DotsState, Line } from '@/lib/rules/dots';

export function DotsBoard({
  s,
  marks,
  enabled,
  onTap,
}: {
  s: DotsState;
  marks: [string, string];
  enabled: boolean;
  onTap: (line: Line) => void;
}) {
  const reduced = useReducedMotion();
  const N = 4;

  const size = 2 * N + 1;
  const track = Array.from({ length: size }, (_, i) => (i % 2 === 0 ? '14px' : '1fr')).join(' ');

  return (
    <div
      className="relative grid w-full aspect-square p-3 bg-[radial-gradient(ellipse_at_center,_#f5f1e8_0%,_#e8e0cf_100%)] poster-border shadow-[inset_0_0_30px_rgba(0,0,0,0.15),_8px_8px_0_0_#0A0A0A] rounded-[4px]"
      style={{ gridTemplateColumns: track, gridTemplateRows: track }}
    >
      {/* paper grain */}
      <div className="absolute inset-0 rounded-[2px] opacity-[0.06] pointer-events-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%220.5%22/></svg>')]" />
      {Array.from({ length: size * size }, (_, k) => {
        const i = Math.floor(k / size), j = k % size;
        if (i % 2 === 0 && j % 2 === 0) {
          return (
            <span key={k} className="rounded-full bg-[radial-gradient(circle,_#5a4a35_0%,_#3a2a1a_100%)] shadow-[inset_0_0_6px_rgba(0,0,0,0.6)]" />
          );
        }
        if (i % 2 === 0) {
          const r = i / 2, c = (j - 1) / 2;
          const on = s.h[r][c];
          return (
            <button
              key={k}
              aria-label={`Horizontal line ${r + 1},${c + 1}`}
              disabled={!enabled || on}
              onClick={() => onTap({ kind: 'h', r, c })}
              className={`my-[3px] rounded-full relative transition-all ${on ? 'bg-brand-black' : enabled ? 'bg-brand-black/10 hover:bg-brand-purple/60' : 'bg-brand-black/10'} ${!on && enabled ? '[cursor-crosshair]' : ''} ${!reduced && !on && enabled ? 'animate-[penStroke_400ms_cubic-bezier(.2,.8,.2,1)]' : ''}`}
            >
              {!on && enabled && <span className="absolute inset-0 rounded-full bg-[linear-gradient(90deg,transparent,rgba(0,0,0,0.08),transparent)] pointer-events-none" />}
            </button>
          );
        }
        if (j % 2 === 0) {
          const r = (i - 1) / 2, c = j / 2;
          const on = s.v[r][c];
          return (
            <button
              key={k}
              aria-label={`Vertical line ${r + 1},${c + 1}`}
              disabled={!enabled || on}
              onClick={() => onTap({ kind: 'v', r, c })}
              className={`mx-[3px] rounded-full relative transition-all ${on ? 'bg-brand-black' : enabled ? 'bg-brand-black/10 hover:bg-brand-purple/60' : 'bg-brand-black/10'} ${!reduced && !on && enabled ? 'animate-[penStroke_400ms_cubic-bezier(.2,.8,.2,1)]' : ''}`}
            >
              {!on && enabled && <span className="absolute inset-0 rounded-full bg-[linear-gradient(0deg,transparent,rgba(0,0,0,0.08),transparent)] pointer-events-none" />}
            </button>
          );
        }
        const o = s.box[(i - 1) / 2][(j - 1) / 2];
        const isOwned = o !== 0;
        return (
          <span
            key={k}
            className={`flex items-center justify-center font-display font-black text-xl relative overflow-hidden ${o === 1 ? 'bg-brand-acid' : o === 2 ? 'bg-brand-purple text-brand-cream' : ''}`}
          >
            {isOwned && !reduced && (
              <span className="absolute inset-0 animate-[fillBox_500ms_ease-out] bg-[inherit]/80" />
            )}
            {isOwned && (
              <span className="relative z-10 [animation:stamp_450ms_cubic-bezier(.2,.8,.2,1)]">
                {o === 1 ? marks[0] : marks[1]}
              </span>
            )}
          </span>
        );
      })}
      <style>{`
        @media (prefers-reduced-motion: no-preference){
          @keyframes penStroke{
            0% { transform: scaleX(0.2); opacity:0; }
            100% { transform: scaleX(1); opacity:1; }
          }
          @keyframes fillBox{
            0% { transform: scale(0.8); opacity:0; }
            100% { transform: scale(1); opacity:1; }
          }
          @keyframes stamp{
            0% { transform: scale(0.6) rotate(-6deg); opacity:0; }
            60% { transform: scale(1.1) rotate(2deg); opacity:1; }
            100% { transform: scale(1) rotate(0deg); }
          }
        }
        @media (prefers-reduced-motion: reduce){
          button, span { animation:none !important; transition:none !important; }
        }
      `}</style>
    </div>
  );
}
