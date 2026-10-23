'use client';

import { useEffect, useRef, useState } from 'react';
import { Btn, Result } from '@/components/arcade/ui';
import { play, buzz } from '@/lib/sfx';
import {
  COLOR_NAMES, HOME, LAST_TRACK, SAFE, START, YARD, aiSeed, dieRoll, finished, fresh, legalSeeds, move, roll, square,
  type Action, type State,
} from '@/lib/rules/ludo';

const N = 15;
const COLORS = ['#ef4444', '#22c55e', '#eab308', '#3b82f6'];
const SOFT = ['#fecaca', '#bbf7d0', '#fef08a', '#bfdbfe'];

// The 52 shared squares, clockwise from Red's start, as [row, col] on a 15x15 board
const TRACK: [number, number][] = [
  ...[1, 2, 3, 4, 5].map(c => [6, c]), ...[5, 4, 3, 2, 1, 0].map(r => [r, 6]), [0, 7], [0, 8],
  ...[1, 2, 3, 4, 5].map(r => [r, 8]), ...[9, 10, 11, 12, 13, 14].map(c => [6, c]), [7, 14], [8, 14],
  ...[13, 12, 11, 10, 9].map(c => [8, c]), ...[9, 10, 11, 12, 13, 14].map(r => [r, 8]), [14, 7], [14, 6],
  ...[13, 12, 11, 10, 9].map(r => [r, 6]), ...[5, 4, 3, 2, 1, 0].map(c => [8, c]), [7, 0], [6, 0],
] as [number, number][];
const LANE: [number, number][][] = [
  [1, 2, 3, 4, 5].map(c => [7, c]), [1, 2, 3, 4, 5].map(r => [r, 7]),
  [13, 12, 11, 10, 9].map(c => [7, c]), [13, 12, 11, 10, 9].map(r => [r, 7]),
] as [number, number][][];
const YARD_AT: [number, number][] = [[0, 0], [0, 9], [9, 9], [9, 0]];
const HOME_AT: [number, number][] = [[7, 6.25], [6.25, 7], [7, 7.75], [7.75, 7]];

// Centre of a seed, in board cells
function spot(color: number, progress: number, seed: number): [number, number] {
  if (progress === YARD) {
    const [r, c] = YARD_AT[color];
    return [r + 1.5 + (seed >> 1) * 3, c + 1.5 + (seed & 1) * 3];
  }
  if (progress === HOME) return [HOME_AT[color][0] + 0.5, HOME_AT[color][1] + 0.5];
  const [r, c] = progress <= LAST_TRACK ? TRACK[square(color, progress)!] : LANE[color][progress - LAST_TRACK - 1];
  return [r + 0.5, c + 0.5];
}

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]], 5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]],
};

function Die({ value, rolling, active, color, onRoll }: { value: number | null; rolling: boolean; active: boolean; color: string; onRoll: () => void }) {
  const [face, setFace] = useState(value ?? 6);
  useEffect(() => {
    if (!rolling) return;
    const t = window.setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 70);
    return () => window.clearInterval(t);
  }, [rolling]);
  const shown = rolling ? face : value ?? face;
  return (
    <button
      type="button"
      onClick={onRoll}
      disabled={!active}
      aria-label={active ? 'Roll the die' : `Die shows ${shown}`}
      className={`relative w-20 h-20 rounded-2xl bg-white border-4 border-brand-black shadow-[4px_4px_0_0_#0A0A0A] ${rolling ? 'animate-[ldShake_120ms_linear_infinite]' : ''} ${active ? 'ring-4 ring-offset-2' : 'opacity-90'}`}
      style={{ ['--tw-ring-color' as string]: color }}
    >
      {PIPS[shown].map(([x, y], i) => (
        <span key={i} className="absolute w-[18%] h-[18%] rounded-full -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%`, background: shown === 1 ? color : '#0A0A0A' }} />
      ))}
    </button>
  );
}

// Shake the phone to roll. iPhones need a tap first to allow motion.
function useShake(enabled: boolean, onShake: () => void) {
  const handler = useRef(onShake);
  useEffect(() => { handler.current = onShake; }, [onShake]);
  useEffect(() => {
    if (!enabled) return;
    let prev: { x: number; y: number; z: number } | null = null;
    let last = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const cur = { x: a.x ?? 0, y: a.y ?? 0, z: a.z ?? 0 };
      if (prev) {
        const jolt = Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y) + Math.abs(cur.z - prev.z);
        if (jolt > 24 && Date.now() - last > 1200) { last = Date.now(); handler.current(); }
      }
      prev = cur;
    };
    window.addEventListener('devicemotion', onMotion);
    return () => window.removeEventListener('devicemotion', onMotion);
  }, [enabled]);
}

async function allowMotion() {
  const DM = (globalThis as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent;
  if (DM?.requestPermission) { try { await DM.requestPermission(); } catch { /* tapping still rolls */ } }
}

// Animates seeds square by square when the game state moves one, then settles on the real positions.
function useShownPositions(s: State) {
  const [shown, setShown] = useState(s.pos);
  const [moving, setMoving] = useState(false);
  const seen = useRef<string>('');
  useEffect(() => {
    const key = s.last ? `${s.rolls}:${s.last.seat}:${s.last.seed}:${s.last.to}` : `${s.rolls}`;
    if (key === seen.current) return;
    seen.current = key;
    const last = s.last;
    if (!last) { const t = setTimeout(() => setShown(s.pos), 0); return () => clearTimeout(t); }
    const path: number[] = [];
    if (last.from === YARD) path.push(0);
    else for (let p = last.from + 1; p <= last.to; p++) path.push(p);
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setMoving(true), 0));
    path.forEach((p, i) => timers.push(window.setTimeout(() => {
      setShown(cur => cur.map((seeds, seat) => seat === last.seat ? seeds.map((v, k) => (k === last.seed ? p : v)) : seeds));
      play('tap');
    }, 150 * (i + 1))));
    timers.push(window.setTimeout(() => {
      setShown(s.pos);
      setMoving(false);
      if (last.captured.length) { play('capture'); buzz([40, 40, 40]); }
      else if (last.to === HOME) play('win');
    }, 150 * path.length + 160));
    return () => timers.forEach(t => window.clearTimeout(t));
  }, [s]);
  return { shown, moving };
}

function Board({ s, shown, mySeat, movable, onSeed }: { s: State; shown: number[][]; mySeat: number | null; movable: number[]; onSeed: (seed: number) => void }) {
  const cell = (r: number, c: number) => ({ left: `${(c / N) * 100}%`, top: `${(r / N) * 100}%`, width: `${100 / N}%`, height: `${100 / N}%` });
  const seeds = s.names.flatMap((_, seat) => shown[seat].map((p, seed) => ({ seat, seed, p, at: spot(s.colors[seat], p, seed) })));
  const stack = new Map<string, number>();
  const used = new Set(s.colors);
  return (
    <div data-sfx="none" className="relative w-full aspect-square bg-white rounded-xl border-4 border-brand-black poster-shadow overflow-hidden select-none">
      {YARD_AT.map(([r, c], color) => (
        <div key={`y${color}`} className="absolute p-[3%]" style={{ ...cell(r, c), width: `${600 / N}%`, height: `${600 / N}%`, background: COLORS[color], opacity: used.has(color) ? 1 : 0.35 }}>
          <div className="w-full h-full rounded-lg bg-white/90 border-2 border-black/20" />
        </div>
      ))}
      {TRACK.map(([r, c], i) => {
        const startColor = START.indexOf(i);
        return (
          <div key={`t${i}`} className="absolute border border-black/15 flex items-center justify-center text-[clamp(8px,2.4vw,12px)] leading-none" style={{ ...cell(r, c), background: startColor >= 0 ? COLORS[startColor] : '#fff' }}>
            {SAFE.has(i) && startColor < 0 && <span aria-hidden="true" className="text-black/35">★</span>}
          </div>
        );
      })}
      {LANE.flatMap((lane, color) => lane.map(([r, c], i) => <div key={`l${color}${i}`} className="absolute border border-black/15" style={{ ...cell(r, c), background: COLORS[color] }} />))}
      <div className="absolute" style={{ ...cell(6, 6), width: `${300 / N}%`, height: `${300 / N}%`, background: `conic-gradient(from 225deg, ${COLORS[0]} 0 25%, ${COLORS[1]} 0 50%, ${COLORS[2]} 0 75%, ${COLORS[3]} 0 100%)` }} />

      {seeds.map(({ seat, seed, p, at }) => {
        const key = `${at[0]},${at[1]}`;
        const n = stack.get(key) ?? 0;
        stack.set(key, n + 1);
        const can = seat === mySeat && movable.includes(seed);
        const color = s.colors[seat];
        return (
          <button
            key={`${seat}-${seed}`}
            type="button"
            disabled={!can}
            onClick={() => onSeed(seed)}
            aria-label={`${COLOR_NAMES[color]} seed ${seed + 1}${p === YARD ? ' in the yard' : p === HOME ? ' home' : ''}${can ? ', can move' : ''}`}
            className={`absolute rounded-full border-[3px] border-white before:content-[''] before:absolute before:-inset-[45%] before:rounded-full shadow-[0_2px_0_2px_rgba(0,0,0,.45)] transition-[left,top] duration-150 ease-out ${can ? 'z-20 animate-[ldBob_700ms_ease-in-out_infinite]' : 'z-10'}`}
            style={{
              width: `${(100 / N) * 0.82}%`, height: `${(100 / N) * 0.82}%`,
              left: `${((at[1] + n * 0.18) / N) * 100}%`, top: `${((at[0] - n * 0.18) / N) * 100}%`,
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle at 35% 30%, ${SOFT[color]}, ${COLORS[color]} 60%)`,
              outline: can ? '3px solid #0A0A0A' : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

function Players({ s, mySeat }: { s: State; mySeat: number | null }) {
  return (
    <div className="grid grid-cols-2 gap-2 mb-3">
      {s.names.map((name, seat) => {
        const home = s.pos[seat].filter(p => p === HOME).length;
        const turn = s.turn === seat && !finished(s);
        return (
          <div key={seat} className={`flex items-center gap-2 p-2 poster-border font-display font-black uppercase text-xs ${turn ? 'bg-brand-acid' : 'bg-white'}`}>
            <span className="w-4 h-4 rounded-full border-2 border-brand-black shrink-0" style={{ background: COLORS[s.colors[seat]] }} />
            <span className="truncate">{name}{seat === mySeat && name !== 'You' ? ' (you)' : ''}</span>
            <span className="ml-auto tabular-nums">{home}/4</span>
          </div>
        );
      })}
    </div>
  );
}

function Controls({ s, mySeat, rolling, shake, onRoll, message }: { s: State; mySeat: number | null; rolling: boolean; shake: boolean; onRoll: () => void; message: string }) {
  const myTurn = mySeat !== null && s.turn === mySeat && !finished(s);
  const canRoll = myTurn && s.die === null && !rolling;
  return (
    <div className="flex items-center gap-4 mt-4">
      <Die value={s.lastRoll} rolling={rolling} active={canRoll} color={COLORS[s.colors[s.turn]]} onRoll={onRoll} />
      <p className="font-body text-sm flex-1" aria-live="polite">
        {message}
        {canRoll && <span className="block font-display font-black uppercase">{shake ? 'Shake your phone or tap the die' : 'Tap the die to roll'}</span>}
      </p>
    </div>
  );
}

function useRolling(s: State) {
  const [rolling, setRolling] = useState(false);
  const seen = useRef(s.rolls);
  useEffect(() => {
    if (s.rolls === seen.current) return;
    seen.current = s.rolls;
    const start = window.setTimeout(() => { setRolling(true); play('flip'); }, 0);
    const stop = window.setTimeout(() => setRolling(false), 650);
    return () => { window.clearTimeout(start); window.clearTimeout(stop); };
  }, [s.rolls]);
  return rolling;
}

const hasMotion = () => typeof window !== 'undefined' && 'DeviceMotionEvent' in window;

export default function Ludo({ award }: { award: (n: number) => void }) {
  const [bots, setBots] = useState(3);
  const [s, setS] = useState<State | null>(null);
  const [points, setPoints] = useState(0);
  const [shake, setShake] = useState(false);

  const start = () => {
    setS(fresh(['You', ...['Computer 1', 'Computer 2', 'Computer 3'].slice(0, bots)]));
    setPoints(0);
  };

  if (!s) {
    return (
      <div className="p-5 poster-border poster-shadow bg-white">
        <p className="font-body text-lg mb-3">Roll a 6 to bring a seed out. Race all four round the board and into the middle. Land on someone to send them home.</p>
        <ul className="font-body text-sm mb-4 list-disc pl-5 space-y-1">
          <li>A 6, a capture, or getting a seed home = roll again</li>
          <li>★ and start squares are safe</li>
          <li>You need the exact number to get home</li>
        </ul>
        <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50 mb-2">Computer players</div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[1, 2, 3].map(n => (
            <button key={n} type="button" onClick={() => setBots(n)} className={`py-3 poster-border font-display font-black ${bots === n ? 'bg-brand-purple text-brand-cream' : 'bg-white'}`}>{n}</button>
          ))}
        </div>
        <Btn className="w-full" onClick={start}>START →</Btn>
      </div>
    );
  }
  return <LudoSolo s={s} setS={setS} award={award} points={points} setPoints={setPoints} shake={shake} setShake={setShake} onReset={() => setS(null)} />;
}

function LudoSolo({ s, setS, award, points, setPoints, shake, setShake, onReset }: {
  s: State; setS: (s: State) => void; award: (n: number) => void; points: number; setPoints: (n: number) => void;
  shake: boolean; setShake: (b: boolean) => void; onReset: () => void;
}) {
  const { shown, moving } = useShownPositions(s);
  const rolling = useRolling(s);
  const over = finished(s);
  const busy = moving || rolling;
  const mine = s.turn === 0 && !over;
  const movable = mine && s.die !== null && !busy ? legalSeeds(s, 0, s.die) : [];

  const doRoll = () => {
    if (!mine || s.die !== null || busy) return;
    buzz(30);
    setS(roll(s, dieRoll()));
  };
  useShake(shake && mine && s.die === null && !busy, doRoll);

  const tapDie = () => {
    if (!shake && hasMotion()) { setShake(true); void allowMotion(); }
    doRoll();
  };

  const settle = (next: State) => {
    if (!finished(next)) return;
    const pts = next.winner === 0 ? 80 : 0;
    award(pts);
    setPoints(pts);
  };
  const moveSeed = (seed: number) => {
    const next = move(s, seed);
    setS(next);
    settle(next);
  };

  // Only one seed can move: move it for you
  useEffect(() => {
    if (!mine || s.die === null || busy) return;
    const options = legalSeeds(s, 0, s.die);
    if (options.length !== 1) return;
    const t = window.setTimeout(() => moveSeed(options[0]), 450);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, busy, mine]);

  // Computer turns
  useEffect(() => {
    if (over || s.turn === 0 || busy) return;
    const t = window.setTimeout(() => {
      if (s.die === null) setS(roll(s, dieRoll()));
      else moveSeed(aiSeed(s, s.turn));
    }, s.die === null ? 650 : 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, busy, over]);

  const message = over ? '' : s.note || (s.turn === 0
    ? s.die === null ? 'Your turn.' : movable.length > 1 ? `You rolled ${s.die}. Tap a glowing seed.` : `You rolled ${s.die}.`
    : `${s.names[s.turn]} is playing…`);

  return (
    <div>
      <Players s={s} mySeat={0} />
      <Board s={s} shown={shown} mySeat={0} movable={movable} onSeed={moveSeed} />
      <Controls s={s} mySeat={0} rolling={rolling} shake={shake} onRoll={tapDie} message={message} />
      {over && (
        <Result
          tone={s.winner === 0 ? 'win' : 'lose'}
          emoji={s.winner === 0 ? '🏆' : '🎲'}
          title={s.winner === 0 ? 'YOU WIN!' : `${s.winner !== null ? s.names[s.winner] : 'Nobody'} WINS`}
          detail={s.winner === 0 ? 'All four seeds home.' : 'So close. Go again?'}
          points={points}
          onAgain={onReset}
        />
      )}
      {!over && <Btn variant="light" className="w-full mt-4" onClick={onReset}>NEW GAME</Btn>}
      <style>{LUDO_CSS}</style>
    </div>
  );
}

export function LudoOnline({ view, seat, act }: { view: State; seat: number | null; names: string[]; act: (a: Action) => Promise<void> }) {
  const s = view;
  const [err, setErr] = useState('');
  const [shake, setShake] = useState(false);
  const [sending, setSending] = useState(false);
  const { shown, moving } = useShownPositions(s);
  const rolling = useRolling(s);
  const over = finished(s);
  const busy = moving || rolling || sending;
  const mine = seat !== null && s.turn === seat && !over;
  const movable = mine && s.die !== null && !busy ? legalSeeds(s, seat, s.die) : [];

  const send = async (a: Action) => {
    setErr(''); setSending(true);
    try { await act(a); }
    catch (e) { setErr((e instanceof Error ? e.message : String(e)).replace(/^Uncaught Error: /, '').split('\n')[0]); play('error'); }
    finally { setSending(false); }
  };
  const doRoll = () => { if (mine && s.die === null && !busy) { buzz(30); void send({ kind: 'roll' }); } };
  useShake(shake && mine && s.die === null && !busy, doRoll);
  const tapDie = () => {
    if (!shake && hasMotion()) { setShake(true); void allowMotion(); }
    doRoll();
  };

  useEffect(() => {
    if (!mine || s.die === null || busy || seat === null) return;
    const options = legalSeeds(s, seat, s.die);
    if (options.length !== 1) return;
    const t = window.setTimeout(() => void send({ kind: 'move', seed: options[0] }), 450);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, busy, mine]);

  const message = over ? '' : s.note || (mine
    ? s.die === null ? 'Your turn.' : movable.length > 1 ? `You rolled ${s.die}. Tap a glowing seed.` : `You rolled ${s.die}.`
    : `${s.names[s.turn]} is playing…`);

  return (
    <div data-online-board="ludo">
      {seat !== null && <p className="mb-2 text-center font-body text-xs text-brand-black/60">You are {COLOR_NAMES[s.colors[seat]]}.</p>}
      <Players s={s} mySeat={seat} />
      <Board s={s} shown={shown} mySeat={seat} movable={movable} onSeed={seed => void send({ kind: 'move', seed })} />
      <Controls s={s} mySeat={seat} rolling={rolling} shake={shake} onRoll={tapDie} message={message} />
      {err && <p role="alert" className="mt-2 text-center font-body text-sm text-brand-coral">{err}</p>}
      <style>{LUDO_CSS}</style>
    </div>
  );
}

const LUDO_CSS = `
  @keyframes ldShake { 0% { transform: rotate(-8deg) translateY(-2px); } 50% { transform: rotate(8deg) translateY(2px); } 100% { transform: rotate(-8deg) translateY(-2px); } }
  @keyframes ldBob { 0%, 100% { transform: translate(-50%, -50%) scale(1); } 50% { transform: translate(-50%, -62%) scale(1.08); } }
  @media (prefers-reduced-motion: reduce) { [data-sfx="none"] *, button { animation: none !important; transition: none !important; } }
`;
