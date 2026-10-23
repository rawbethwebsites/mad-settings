'use client';

import { useReducedMotion } from '@/components/three/useReducedMotion';

// Long words shrink so they stay inside their square on a phone.
function wordSize(word: string) {
  const longest = Math.max(...word.split(' ').map(w => w.length));
  if (longest >= 9) return 'text-[clamp(7px,2.2vw,8px)] sm:text-xs md:text-sm';
  if (longest === 8) return 'text-[clamp(7px,2.5vw,9px)] sm:text-xs md:text-sm';
  if (longest === 7) return 'text-[clamp(8px,2.8vw,10px)] sm:text-xs md:text-sm';
  if (longest === 6) return 'text-[clamp(9px,3vw,11px)] sm:text-xs md:text-sm';
  return 'text-xs md:text-sm';
}

export function BingoBoard({
  grid,
  marked,
  called,
  currentCall,
  won,
  winLine,
  onToggle,
}: {
  grid: string[];
  marked: Set<number>;
  called: Set<string>;
  currentCall: string;
  won: boolean;
  winLine: number[] | null;
  onToggle: (i: number) => void;
}) {
  const reduced = useReducedMotion();

  return (
    <div className="relative">
      {/* Called word announcer */}
      {currentCall && (
        <div className="mb-4 flex items-center justify-center gap-3">
          <div key={currentCall} className={`px-5 py-2 rounded-full bg-brand-black/10 flex items-center justify-center ${!reduced ? 'animate-[flipCall_600ms_ease-in-out]' : ''}`}>
            <span className="font-display font-black text-xl text-brand-black">{currentCall}</span>
          </div>
        </div>
      )}

      {/* Bingo Card - printed paper style */}
      <div className="relative block p-2 sm:p-4 bg-white poster-border poster-shadow shadow-[8px_8px_0_0_#0A0A0A] rounded-[4px]">
        {/* paper grain */}
        <div className="absolute inset-0 rounded-[2px] opacity-[0.08] pointer-events-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%220.5%22/></svg>')]" />

        <div className="grid grid-cols-5 gap-1 sm:gap-[6px] relative z-10">
          {grid.map((word, i) => {
            const isMarked = marked.has(i);
            const isCalled = called.has(word) || word === 'FREE';
            const isWinCell = !!winLine && winLine.includes(i);
            const isFree = word === 'FREE';

            return (
              <button
                key={i}
                onClick={() => onToggle(i)}
                disabled={won || !isCalled || isFree}
                aria-label={`${word}${isMarked ? ' marked' : ''}`}
                className={`relative aspect-square min-w-0 flex items-center justify-center text-center font-display font-black ${wordSize(word)} leading-tight uppercase p-0 border-2 sm:border-[3px] [overflow-wrap:anywhere] transition-all ${isFree ? 'bg-brand-cream text-brand-black border-brand-black cursor-default' : isMarked ? 'bg-brand-purple text-brand-cream border-brand-purple' : isCalled ? 'bg-brand-acid text-brand-black border-brand-black' : 'bg-white text-brand-black/40 border-brand-black/20'} ${!reduced && isMarked ? 'animate-[stamp_350ms_cubic-bezier(.2,.8,.2,1)]' : ''} ${!reduced && isWinCell ? 'animate-[bingoGlow_800ms_ease-in-out_infinite]' : ''}`}
              >
                {word}
                {/* ink dab splash */}
                {isMarked && !reduced && (
                  <span className="absolute inset-0 pointer-events-none animate-[splash_400ms_ease-out]">
                    <span className="absolute inset-0 rounded-full bg-brand-purple/40 blur-[2px]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* confetti for win */}
      {won && !reduced && (
        <div className="fixed inset-0 pointer-events-none z-50" aria-hidden>
          {Array.from({ length: 30 }, (_, k) => {
            const left = `l${k}-v`;
            const bg = ['#EA6113', '#F88F22', '#FBB931', '#FFE3B3', '#EA6113'][k % 5];
            const delay = 100 * (k % 5);
            return (
              <span key={k} className="absolute top-0 w-2 h-4 [animate:confettiFall_2s_ease-out_forwards]" style={{ left: `${(k * 3.7) % 100}%`, backgroundColor: bg, animationDelay: `${delay}ms` }} />
            );
          })}
        </div>
      )}

      <style>{`
        @media (prefers-reduced-motion: no-preference){
          @keyframes flipCall{
            0% { transform: rotateX(90deg) scale(0.8); opacity:0; }
            60% { transform: rotateX(-10deg) scale(1.1); opacity:1; }
            100% { transform: rotateX(0deg) scale(1); }
          }
          @keyframes stamp{
            0% { transform: scale(0.5) rotate(-8deg); opacity:0; }
            60% { transform: scale(1.15) rotate(3deg); opacity:1; }
            100% { transform: scale(1) rotate(0deg); }
          }
          @keyframes splash{
            0% { transform: scale(0.3); opacity:1; }
            100% { transform: scale(1.5); opacity:0; }
          }
          @keyframes bingoGlow{
            0%, 100% { box-shadow: 0 0 0 0 rgba(251,185,49,0.6); }
            50% { box-shadow: 0 0 0 6px rgba(251,185,49,0); }
          }
          @keyframes confettiFall{
            0% { transform: translateY(-10%) rotate(0deg); opacity:1; }
            100% { transform: translateY(120vh) rotate(720deg); opacity:0; }
          }
        }
        @media (prefers-reduced-motion: reduce){
          button, div { animation:none !important; transition:none !important; }
        }
      `}</style>
    </div>
  );
}