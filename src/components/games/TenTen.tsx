'use client';

import { useEffect, useState } from 'react';
import { Btn, Result } from '@/components/arcade/ui';
import React from 'react';
import type { OnlineProps } from '@/lib/rules/types';

type Dir = 'up' | 'down' | 'left' | 'right';
const DIRS: Dir[] = ['up', 'down', 'left', 'right'];
const ICON: Record<Dir, string> = { up: '👆', down: '👇', left: '👈', right: '👉' };
const TO_WIN = 5;
const SECONDS = 3;

type Phase = 'intro' | 'ready' | 'pick' | 'reveal' | 'done';

export default function TenTen({ award }: { award: (n: number) => void }) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState(1);
  const [you, setYou] = useState(0);
  const [cpu, setCpu] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [mine, setMine] = useState<Dir | null>(null);
  const [theirs, setTheirs] = useState<Dir | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [left, setLeft] = useState(SECONDS);
  const [points, setPoints] = useState(0);

  // Odd rounds you chase (match them), even rounds you escape (differ)
  const chaser = round % 2 === 1;

  const resolve = (pick: Dir | null) => {
    const their = DIRS[Math.floor(Math.random() * 4)];
    const same = pick !== null && pick === their;
    const youWin = pick === null ? false : chaser ? same : !same;
    const nextYou = you + (youWin ? 1 : 0);
    const nextCpu = cpu + (youWin ? 0 : 1);
    const nextStreak = youWin ? streak + 1 : 0;
    setMine(pick);
    setTheirs(their);
    setWon(youWin);
    setYou(nextYou);
    setCpu(nextCpu);
    setStreak(nextStreak);
    setBest(b => Math.max(b, nextStreak));
    setPhase('reveal');
    if (nextYou >= TO_WIN || nextCpu >= TO_WIN) {
      const pts = nextYou >= TO_WIN ? 50 + Math.max(best, nextStreak) * 5 : 0;
      award(pts);
      setPoints(pts);
    }
  };

  const go = () => {
    setMine(null);
    setTheirs(null);
    setWon(null);
    setLeft(SECONDS);
    setPhase('pick');
  };

  // One-second ticks while you are choosing; running out counts as a miss
  useEffect(() => {
    if (phase !== 'pick') return;
    const t = window.setTimeout(() => {
      if (left <= 1) resolve(null);
      else setLeft(left - 1);
    }, 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, left]);

  const finished = you >= TO_WIN || cpu >= TO_WIN;
  const reset = () => {
    setPhase('intro'); setRound(1); setYou(0); setCpu(0); setStreak(0); setBest(0);
    setMine(null); setTheirs(null); setWon(null); setPoints(0);
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4 text-center font-display font-black uppercase">
        <div className="p-3 poster-border bg-brand-acid">YOU · {you}</div>
        <div className="p-3 poster-border bg-brand-purple text-brand-cream">COMPUTER · {cpu}</div>
      </div>

      {phase === 'intro' && (
        <div className="p-6 poster-border poster-shadow bg-white">
          <p className="font-body text-lg mb-4">
            Both of you point a direction at the same time. First to <b>{TO_WIN}</b> rounds wins.
          </p>
          <ul className="font-body mb-6 space-y-2 list-disc pl-5">
            <li><b>CHASE</b> rounds: point the <b>same</b> way to catch them.</li>
            <li><b>ESCAPE</b> rounds: point a <b>different</b> way to get away.</li>
            <li>You have {SECONDS} seconds to choose. Miss it and they score.</li>
          </ul>
          <Btn className="w-full" onClick={() => setPhase('ready')}>START →</Btn>
        </div>
      )}

      {(phase === 'ready' || phase === 'pick' || phase === 'reveal') && !finished && (
        <div className="text-center">
          <div className={`inline-block px-4 py-2 mb-4 poster-border font-display font-black uppercase ${chaser ? 'bg-brand-coral' : 'bg-brand-cyan'}`}>
            ROUND {round} · {chaser ? 'CHASE — MATCH THEM' : 'ESCAPE — DIFFER'}
          </div>
        </div>
      )}

      {phase === 'ready' && (
        <Btn className="w-full py-6 text-xl" onClick={go}>TEN TEN! →</Btn>
      )}

      {phase === 'pick' && (
        <div className="p-6 poster-border poster-shadow bg-white text-center">
          <div className="font-display font-black text-6xl text-brand-purple mb-4">{Math.max(left, 0)}</div>
          <div className="grid grid-cols-2 gap-3">
            {DIRS.map(d => (
              <button key={d} onClick={() => resolve(d)} aria-label={`Point ${d}`}
                className="py-6 text-5xl poster-border bg-brand-cream hover:bg-brand-acid">
                {ICON[d]}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'reveal' && (
        <div className={`p-6 poster-border poster-shadow text-center text-brand-black ${won ? 'bg-brand-acid' : 'bg-brand-coral'}`}>
          <div className="flex justify-center gap-8 text-5xl mb-3">
            <div><div className="font-display font-bold text-xs uppercase">YOU</div>{mine ? ICON[mine] : '😴'}</div>
            <div><div className="font-display font-bold text-xs uppercase">THEM</div>{theirs ? ICON[theirs] : '—'}</div>
          </div>
          <div className="font-display font-black text-2xl uppercase mb-1">
            {won ? (chaser ? 'CAUGHT THEM!' : 'ESCAPED!') : mine ? (chaser ? 'THEY GOT AWAY' : 'THEY CAUGHT YOU') : 'TOO SLOW'}
          </div>
          {streak > 1 && <div className="font-display font-bold text-sm">🔥 {streak} IN A ROW</div>}
          {!finished && (
            <Btn variant="dark" className="w-full mt-4" onClick={() => { setRound(r => r + 1); setPhase('ready'); }}>
              NEXT ROUND →
            </Btn>
          )}
        </div>
      )}

      {finished && phase === 'reveal' && (
        <Result
          tone={you >= TO_WIN ? 'win' : 'lose'}
          emoji={you >= TO_WIN ? '🏆' : '🤖'}
          title={you >= TO_WIN ? 'YOU WIN!' : 'COMPUTER WINS'}
          detail={`${you} to ${cpu}`}
          points={points}
          onAgain={reset}
        />
      )}
    </div>
  );
}

export function TenTenOnline({ view, seat, names, act }: OnlineProps<{
  round: number;
  chaser: boolean;
  myPick: Dir | null;
  theirPick: Dir | null;
  reveal: { p0: Dir | null; p1: Dir | null; same: boolean } | null;
  scores: number[];
  winner: number | null;
}, { dir: Dir }>) {
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const send = async (a: { dir: Dir }) => { setErr(null); setBusy(true); try { await act(a); } catch(e){ setErr(e instanceof Error ? e.message : 'Error'); } finally { setBusy(false); } };
  const myPick = view?.myPick ?? null;
  const theirPick = view?.theirPick ?? null;
  const reveal = view?.reveal ?? null;
  const scores = view?.scores ?? [0,0];
  const winner = view?.winner ?? null;
  const chaser = view?.chaser ?? true;
  const round = view?.round ?? 1;
  const canPick = seat !== null && !winner && myPick === null && !reveal;
  const ICONS: Record<Dir, string> = {up:'👆',down:'👇',left:'👈',right:'👉'};
  const Icon = (d: Dir | null)=> d ? ICONS[d] : '';
  const DIRS: Dir[] = ['up','down','left','right'];
  return (
    <div>
      <div className={`p-3 poster-border text-center font-display font-black uppercase mb-4 ${canPick?'bg-brand-acid':'bg-white'}`}>ROUND {round} · {chaser?'CHASE — MATCH THEM':'ESCAPE — DIFFER'}</div>
      <div className="grid grid-cols-2 gap-3 mb-4 text-center font-display font-black uppercase">
        <div className="p-3 poster-border bg-brand-acid">YOU · {scores[seat ?? 0] ?? 0}</div>
        <div className="p-3 poster-border bg-brand-purple text-brand-cream">{names[seat===0?1:0]} · {scores[seat===0?1:0] ?? 0}</div>
      </div>
      <div className="p-6 poster-border poster-shadow bg-white text-center">
        <div className="font-display font-black text-5xl mb-4">TEN TEN!</div>
        {reveal ? (
          <div>
            <div className="flex justify-center gap-8 text-5xl mb-3"><div><div className="font-display font-bold text-xs uppercase">YOU</div>{Icon(myPick)}</div><div><div className="font-display font-bold text-xs uppercase">THEM</div>{Icon(theirPick)}</div></div>
            <div className="font-display font-black text-2xl uppercase">{winner===seat ? 'YOU WIN ROUND' : 'THEY WIN ROUND'}</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">{DIRS.map(d=><button key={d} onClick={()=>send({dir:d})} disabled={!canPick||busy} className="py-6 text-5xl poster-border bg-brand-cream hover:bg-brand-acid disabled:opacity-50">{Icon(d)}</button>)}</div>
        )}
      </div>
      {err && <div role="alert" className="mt-3 p-3 poster-border bg-brand-coral font-display font-bold text-sm text-center">{err}</div>}
      {winner!==null && <div className={`mt-6 p-8 poster-border poster-shadow text-center ${winner===seat?'bg-brand-acid':'bg-brand-coral'}`}><div className="text-6xl mb-3">{winner===seat?'🏆':'🤖'}</div><h2 className="font-display font-black text-3xl uppercase italic mb-2">{winner===seat?'YOU WIN!':'YOU LOSE'}</h2></div>}
    </div>
  );
}
