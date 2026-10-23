'use client';

import { useEffect, useRef, useState } from 'react';

type P = 'X' | 'O';

export function TicTacToeBoard({
  cells,
  queue,
  active,
  win,
  enabled,
  onTap,
}: {
  cells: (P | null)[];
  queue: Record<P, number[]>;
  active: P | null;
  win: { p: P; line: number[] } | null;
  enabled: boolean;
  onTap: (i: number) => void;
}) {
  const fading = (i: number) => !win && active !== null && queue[active].length === 3 && queue[active][0] === i;
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="relative aspect-square w-full rounded-[8px] border-[12px] border-stone-800 bg-[radial-gradient(ellipse_at_center,_#2e2a25_0%,_#1a1612_100%)] shadow-[inset_0_0_40px_rgba(0,0,0,0.7),_6px_6px_0_0_#0A0A0A] p-3">
      {/* slate texture */}
      <div className="absolute inset-3 rounded-[6px] bg-[linear-gradient(105deg,_#3b3630_0%,_#2c2722_100%)] opacity-90 pointer-events-none" />
      <div className="grid grid-cols-3 gap-[10px] h-full">
        {cells.map((v,i)=>{
          const isWin = !!win && win.line.includes(i);
          const isFading = fading(i);
          const isEmpty = !v;
          return (
            <button
              key={i}
              onClick={()=>{onTap(i);}}
              disabled={!enabled || !isEmpty}
              aria-label={`Square ${i+1}${v?` ${v}`:''}`}
              className={`relative flex items-center justify-center text-[clamp(40px,12vw,96px)] font-display font-black select-none [text-shadow:3px_3px_0_#0A0A0A] transition-transform duration-300 ${enabled && isEmpty ? 'hover:scale-[1.02] active:scale-[0.98]' : ''} ${isWin ? 'animate-pulse' : ''}`}
            >
              {/* cell background */}
              <div className={`absolute inset-0 rounded-[6px] border-[4px] border-stone-700 bg-[linear-gradient(180deg,_#4a453f_0%,_#2f2a25_100%)] ${isWin ? 'bg-brand-acid/30' : ''}`} />
              {/* chalk mark */}
              <span className={`relative [font-family:'Times_New_Roman',serif] ${v==='X' ? 'text-brand-coral' : 'text-brand-cream'} ${isFading ? 'opacity-30 [animation:ember 900ms_ease-in_forwards]' : ''} ${v ? '[animation:chalkDraw_600ms_cubic-bezier(.2,.8,.2,1)]' : ''}`} style={{opacity: v?1:0}}>
                {v}
              </span>
              {/* ember flicker */}
              {isFading && (
                <span className="absolute inset-0 pointer-events-none [animation:emberFlicker_900ms_steps(4)_infinite] opacity-70" aria-hidden>
                  <span className="absolute inset-[20%] rounded-full bg-orange-500/40 blur-[8px]" />
                </span>
              )}
              {/* winning glow */}
              {isWin && <span className="absolute inset-0 rounded-[6px] ring-[4px] ring-brand-acid/80 animate-[pulse_1.2s_ease-in-out_infinite]" />}
            </button>
          )
        })}
      </div>
      <style>{`
        @media (prefers-reduced-motion: no-preference){
          @keyframes chalkDraw{
            0% { transform: scale(0.2) rotate(-12deg); opacity:0; }
            60% { transform: scale(1.05) rotate(2deg); opacity:1; }
            100% { transform: scale(1) rotate(0deg); }
          }
          @keyframes ember{
            0% { opacity:1; transform: scale(1); filter: brightness(1); }
            40% { opacity:0.6; transform: scale(1.05); filter: brightness(1.4); }
            100% { opacity:0; transform: scale(0.6); filter: brightness(0); }
          }
          @keyframes emberFlicker{
            0% { opacity:0.8 }
            50% { opacity:0.3 }
            100% { opacity:0.8 }
          }
        }
        @media (prefers-reduced-motion: reduce){
          button { transition:none !important; animation:none !important; }
        }
      `}</style>
    </div>
  );
}
