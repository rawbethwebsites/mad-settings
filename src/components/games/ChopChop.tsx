'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Btn } from '@/components/arcade/ui';
import { play, buzz } from '@/lib/sfx';
import { useResultSound } from '@/lib/useGameSounds';
import {
  SIZE, canSwap, combo, findMove, isCombo, level as levelFor, newBoard, resolve, shuffle, stars as starsFor, swap,
  type Board, type Cell, type Special,
} from './chopchop/engine';

const SNACKS = [
  { e: '🍢', name: 'Suya', bg: 'radial-gradient(circle at 32% 28%, #ffb3b3, #ef4444 45%, #991b1b)' },
  { e: '🍩', name: 'Puff-puff', bg: 'radial-gradient(circle at 32% 28%, #bfdbfe, #3b82f6 45%, #1e3a8a)' },
  { e: '🌭', name: 'Sausage roll', bg: 'radial-gradient(circle at 32% 28%, #fbcfe8, #ec4899 45%, #9d174d)' },
  { e: '🥜', name: 'Groundnut', bg: 'radial-gradient(circle at 32% 28%, #bbf7d0, #22c55e 45%, #166534)' },
  { e: '🍌', name: 'Plantain', bg: 'radial-gradient(circle at 32% 28%, #fef9c3, #facc15 45%, #a16207)' },
  { e: '🍊', name: 'Agbalumo', bg: 'radial-gradient(circle at 32% 28%, #e9d5ff, #a855f7 45%, #581c87)' },
];
const POT_BG = 'conic-gradient(from 30deg, #ef4444, #f59e0b, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)';
const SPECIAL_NAME: Record<Special, string> = { none: '', row: 'striped across', col: 'striped down', bomb: 'bomb', pot: 'Jollof pot' };
const PRAISE = ['', '', 'Sweet!', 'Tasty!', 'Delicious!', 'Chop life! 🔥'];
const SAVE_KEY = 'mad-settings-chopchop';

type Anim = { type: 'move' | 'nudge'; fx: number; fy: number; ms: number };
type Float = { id: number; x: number; y: number; text: string };

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

function loadProgress(): { unlocked: number; best: Record<number, number> } {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return { unlocked: saved.unlocked || 1, best: saved.best || {} };
  } catch { return { unlocked: 1, best: {} }; }
}

function saveProgress(p: { unlocked: number; best: Record<number, number> }) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(p)); } catch { /* private mode: progress just isn't kept */ }
}

function pointsFor(stars: number) {
  return [5, 30, 45, 60][stars];
}

export default function ChopChop({ award }: { award: (n: number) => void }) {
  const [progress, setProgress] = useState(() => ({ unlocked: 1, best: {} as Record<number, number> }));
  const [levelNo, setLevelNo] = useState(1);
  const [board, setBoard] = useState<Board | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(levelFor(1).moves);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<Cell | null>(null);
  const [popping, setPopping] = useState<Set<number>>(new Set());
  const [anims, setAnims] = useState<Map<number, Anim>>(new Map());
  const [animRound, setAnimRound] = useState(0);
  const [hint, setHint] = useState<[Cell, Cell] | null>(null);
  const [floats, setFloats] = useState<Float[]>([]);
  const [praise, setPraise] = useState('');
  const [end, setEnd] = useState<{ stars: number; points: number } | null>(null);
  const drag = useRef<{ cell: Cell; x: number; y: number; done: boolean } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const floatId = useRef(0);

  const lvl = levelFor(levelNo);
  const starsNow = starsFor(score, lvl);
  useResultSound(end ? (end.stars > 0 ? 'win' : 'lose') : null);

  const startLevel = useCallback((n: number) => {
    setLevelNo(n);
    setBoard(newBoard(Math.random));
    setScore(0);
    setMoves(levelFor(n).moves);
    setSel(null); setPopping(new Set()); setAnims(new Map()); setFloats([]); setPraise(''); setEnd(null); setHint(null);
  }, []);

  useEffect(() => {
    const p = loadProgress();
    // Read once after mount: localStorage is not available while the page is built on the server.
    const timer = setTimeout(() => { setProgress(p); startLevel(p.unlocked); }, 0);
    return () => clearTimeout(timer);
  }, [startLevel]);

  // After 6 quiet seconds, wiggle a move that works.
  useEffect(() => {
    if (!board || busy || end) return;
    const timer = setTimeout(() => setHint(findMove(board)), 6000);
    return () => clearTimeout(timer);
  }, [board, busy, end]);

  const animate = (next: Map<number, Anim>) => { setAnims(next); setAnimRound(n => n + 1); };

  const addFloat = (cells: { r: number; c: number }[], text: string) => {
    if (!cells.length) return;
    const x = cells.reduce((s, p) => s + p.c, 0) / cells.length;
    const y = cells.reduce((s, p) => s + p.r, 0) / cells.length;
    const id = ++floatId.current;
    setFloats(f => [...f, { id, x, y, text }]);
    setTimeout(() => setFloats(f => f.filter(p => p.id !== id)), 900);
  };

  const trySwap = async (a: Cell, z: Cell) => {
    if (!board || busy || end || moves <= 0) return;
    setSel(null); setHint(null);
    const A = board[a[0]][a[1]]!;
    const Z = board[z[0]][z[1]]!;
    if (!canSwap(board, a, z)) {
      play('error');
      animate(new Map([
        [A.id, { type: 'nudge', fx: z[1] - a[1], fy: z[0] - a[0], ms: 320 }],
        [Z.id, { type: 'nudge', fx: a[1] - z[1], fy: a[0] - z[0], ms: 320 }],
      ]));
      setTimeout(() => setAnims(new Map()), 340);
      return;
    }
    setBusy(true);
    play('place');
    let cur = swap(board, a, z);
    setBoard(cur);
    animate(new Map([
      [A.id, { type: 'move', fx: a[1] - z[1], fy: a[0] - z[0], ms: 170 }],
      [Z.id, { type: 'move', fx: z[1] - a[1], fy: z[0] - a[0], ms: 170 }],
    ]));
    await wait(180);

    let total = score;
    let chain = 1;
    let step = isCombo(board, a, z) ? combo(cur, a, z, Math.random) : resolve(cur, 1, Math.random, [z, a]);
    while (step) {
      setPopping(new Set(step.cleared.map(t => t.id)));
      play(chain > 1 ? 'capture' : 'flip');
      if (step.made.length || step.cleared.length > 5) buzz(25);
      addFloat(step.cleared, `+${step.points}`);
      total += step.points;
      setScore(total);
      if (chain >= 2) setPraise(PRAISE[Math.min(chain, PRAISE.length - 1)]);
      await wait(230);
      cur = step.board;
      setPopping(new Set());
      setBoard(cur);
      const fell = new Map<number, Anim>();
      let longest = 0;
      step.fell.forEach((rows, id) => { fell.set(id, { type: 'move', fx: 0, fy: -rows, ms: 160 + rows * 45 }); longest = Math.max(longest, rows); });
      animate(fell);
      play('drop');
      await wait(170 + longest * 45);
      chain++;
      step = resolve(cur, chain, Math.random);
    }
    setAnims(new Map());
    if (!findMove(cur)) {
      cur = shuffle(cur, Math.random);
      setBoard(cur);
      setPraise('Shuffled!');
    }
    setTimeout(() => setPraise(''), 900);

    const left = moves - 1;
    setMoves(left);
    setBusy(false);
    if (left <= 0) {
      const got = starsFor(total, lvl);
      const points = pointsFor(got);
      award(points);
      setEnd({ stars: got, points });
      setProgress(p => {
        const next = {
          unlocked: got > 0 ? Math.max(p.unlocked, lvl.n + 1) : p.unlocked,
          best: { ...p.best, [lvl.n]: Math.max(p.best[lvl.n] ?? 0, got) },
        };
        saveProgress(next);
        return next;
      });
    }
  };

  const cellAt = (x: number, y: number): Cell | null => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const c = Math.floor(((x - rect.left) / rect.width) * SIZE);
    const r = Math.floor(((y - rect.top) / rect.height) * SIZE);
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE ? [r, c] : null;
  };

  const tap = (cell: Cell) => {
    if (!board || busy || end) return;
    if (!sel) { play('tap'); setSel(cell); return; }
    if (sel[0] === cell[0] && sel[1] === cell[1]) { setSel(null); return; }
    if (Math.abs(sel[0] - cell[0]) + Math.abs(sel[1] - cell[1]) === 1) { trySwap(sel, cell); return; }
    play('tap');
    setSel(cell);
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    const cell = cellAt(e.clientX, e.clientY);
    if (!cell) return;
    drag.current = { cell, x: e.clientX, y: e.clientY, done: false };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* swipes still work without capture */ }
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.done) return;
    const size = (boardRef.current?.getBoundingClientRect().width ?? 320) / SIZE;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < size * 0.35) return;
    d.done = true;
    const to: Cell = Math.abs(dx) > Math.abs(dy) ? [d.cell[0], d.cell[1] + Math.sign(dx)] : [d.cell[0] + Math.sign(dy), d.cell[1]];
    if (to[0] < 0 || to[0] >= SIZE || to[1] < 0 || to[1] >= SIZE) return;
    trySwap(d.cell, to);
  };

  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.done) tap(d.cell);
  };

  const fill = Math.min(100, (score / (lvl.goal * 1.8)) * 100);

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-3 text-center font-display font-black uppercase">
        <div className="p-2 poster-border bg-white">
          <div className="text-[10px] tracking-widest text-brand-black/50">Level</div>
          <div className="text-xl">{lvl.n}</div>
        </div>
        <div className="p-2 poster-border bg-white">
          <div className="text-[10px] tracking-widest text-brand-black/50">Score</div>
          <div className="text-xl tabular-nums">{score}</div>
        </div>
        <div className={`p-2 poster-border ${moves <= 3 && !end ? 'bg-brand-coral' : 'bg-white'}`}>
          <div className="text-[10px] tracking-widest text-brand-black/50">Moves</div>
          <div className="text-xl tabular-nums">{moves}</div>
        </div>
      </div>

      <div className="mb-3" aria-label={`Target ${lvl.goal}. ${starsNow} of 3 stars so far.`}>
        <div className="relative h-7 poster-border bg-white overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-brand-acid transition-[width] duration-300" style={{ width: `${fill}%` }} />
          {[1, 1.4, 1.8].map((m, i) => (
            <span key={m} aria-hidden="true" className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-lg leading-none ${starsNow > i ? 'text-amber-400 [text-shadow:0_1px_0_#0A0A0A]' : 'text-brand-black/15'}`} style={{ left: `${(m / 1.8) * 100 - (i === 2 ? 5 : 0)}%` }}>★</span>
          ))}
        </div>
        <p className="mt-1 font-body text-xs text-center text-brand-black/60">Reach {lvl.goal} in {lvl.moves} moves</p>
      </div>

      <div className="relative p-1.5 rounded-2xl poster-border poster-shadow" style={{ background: 'linear-gradient(160deg,#3b1d5c,#1d1033)' }}>
        <div
          ref={boardRef}
          data-sfx="none"
          role="grid"
          aria-label="Chop Chop board"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => { drag.current = null; }}
          className="relative aspect-square select-none"
          style={{ touchAction: 'none' }}
        >
          {board?.flatMap((row, r) => row.map((t, c) => {
            if (!t) return null;
            const anim = anims.get(t.id);
            const isSel = !!sel && sel[0] === r && sel[1] === c;
            const isHint = !!hint && hint.some(([hr, hc]) => hr === r && hc === c);
            const style = {
              left: `${(c / SIZE) * 100}%`,
              top: `${(r / SIZE) * 100}%`,
              '--fx': anim?.fx ?? 0,
              '--fy': anim?.fy ?? 0,
              animation: popping.has(t.id)
                ? 'ccPop 230ms ease-in forwards'
                : anim
                  ? `${anim.type === 'move' ? 'ccMove' : 'ccNudge'} ${anim.ms}ms ${anim.type === 'move' ? 'cubic-bezier(.5,0,.6,1.25)' : 'ease-in-out'}`
                  : isHint ? 'ccHint 900ms ease-in-out infinite' : undefined,
            } as CSSProperties;
            const snack = SNACKS[t.kind];
            return (
              <div key={`${t.id}:${anim ? animRound : 0}`} className="absolute p-[2px] sm:p-[3px]" style={{ ...style, width: `${100 / SIZE}%`, height: `${100 / SIZE}%` }}>
                <button
                  type="button"
                  tabIndex={0}
                  aria-label={`${t.special === 'pot' ? 'Jollof pot' : snack.name}${t.special !== 'none' && t.special !== 'pot' ? `, ${SPECIAL_NAME[t.special]}` : ''}, row ${r + 1} column ${c + 1}${isSel ? ', picked' : ''}`}
                  onClick={e => { if (e.detail === 0) tap([r, c]); }}
                  className={`relative w-full h-full rounded-[28%] flex items-center justify-center overflow-hidden transition-transform duration-150 ${isSel ? 'scale-110 ring-[3px] ring-white z-10' : ''}`}
                  style={{
                    background: t.special === 'pot' ? POT_BG : snack.bg,
                    boxShadow: 'inset 0 -3px 0 rgba(0,0,0,.25), inset 0 2px 0 rgba(255,255,255,.35), 0 2px 3px rgba(0,0,0,.35)',
                  }}
                >
                  {t.special === 'row' && <span aria-hidden="true" className="absolute inset-0" style={{ background: 'repeating-linear-gradient(0deg, transparent 0 18%, rgba(255,255,255,.55) 18% 30%)' }} />}
                  {t.special === 'col' && <span aria-hidden="true" className="absolute inset-0" style={{ background: 'repeating-linear-gradient(90deg, transparent 0 18%, rgba(255,255,255,.55) 18% 30%)' }} />}
                  {t.special === 'bomb' && <span aria-hidden="true" className="absolute inset-[6%] rounded-[24%] border-[3px] border-dashed border-white/90 animate-[spin_6s_linear_infinite]" />}
                  <span aria-hidden="true" className="relative text-[clamp(18px,5.6vw,30px)] leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,.4)]">
                    {t.special === 'pot' ? '🍲' : snack.e}
                  </span>
                  <span aria-hidden="true" className="absolute top-[8%] left-[16%] w-[34%] h-[18%] rounded-full bg-white/40 blur-[1px]" />
                </button>
              </div>
            );
          }))}

          {floats.map(f => (
            <span key={f.id} aria-hidden="true" className="absolute pointer-events-none font-display font-black text-white text-lg [text-shadow:0_2px_0_#000] animate-[ccFloat_900ms_ease-out_forwards]"
              style={{ left: `${((f.x + 0.5) / SIZE) * 100}%`, top: `${((f.y + 0.5) / SIZE) * 100}%` }}>{f.text}</span>
          ))}

          {praise && (
            <div aria-live="polite" className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span key={praise} className="font-display font-black italic uppercase text-4xl text-brand-acid [text-shadow:0_3px_0_#000,0_0_18px_rgba(0,0,0,.6)] animate-[ccPraise_700ms_cubic-bezier(.2,.9,.3,1.3)]">{praise}</span>
            </div>
          )}
        </div>
      </div>

      <p className="font-body text-sm text-center mt-3">Swipe a snack into its neighbour to make 3 in a row.</p>
      <p className="font-body text-xs text-center mt-1 text-brand-black/60">4 in a row makes a striped snack · L or T makes a bomb · 5 makes a 🍲 Jollof pot</p>

      {end && (
        <div className={`mt-4 p-6 poster-border poster-shadow text-center ${end.stars > 0 ? 'bg-brand-acid' : 'bg-brand-coral'}`}>
          <div className="text-4xl mb-1 tracking-widest" aria-label={`${end.stars} of 3 stars`}>
            {[0, 1, 2].map(i => <span key={i} className={i < end.stars ? '' : 'grayscale opacity-30'}>⭐</span>)}
          </div>
          <h2 className="font-display font-black text-3xl uppercase italic mb-1">{end.stars > 0 ? `Level ${lvl.n} done!` : 'Out of moves'}</h2>
          <p className="font-body text-lg mb-1">You scored {score}. {end.stars > 0 ? '' : `Target was ${lvl.goal}.`}</p>
          <p className="font-display font-black text-xl">+{end.points} PTS</p>
          <div className="flex gap-2 mt-4">
            <Btn variant="light" className="flex-1" onClick={() => startLevel(lvl.n)}>Try again</Btn>
            {end.stars > 0 && <Btn variant="dark" className="flex-1" onClick={() => startLevel(lvl.n + 1)}>Next level →</Btn>}
          </div>
        </div>
      )}
      {!end && levelNo > 1 && (
        <div className="flex justify-center gap-2 mt-3 font-display font-bold text-xs uppercase">
          <button type="button" disabled={busy} onClick={() => startLevel(levelNo - 1)} className="px-3 py-2 underline disabled:opacity-40">← Level {levelNo - 1}</button>
          {levelNo < progress.unlocked && <button type="button" disabled={busy} onClick={() => startLevel(levelNo + 1)} className="px-3 py-2 underline disabled:opacity-40">Level {levelNo + 1} →</button>}
        </div>
      )}

      <style>{`
        @keyframes ccMove { from { transform: translate(calc(var(--fx) * 100%), calc(var(--fy) * 100%)); } to { transform: none; } }
        @keyframes ccNudge { 0%, 100% { transform: none; } 45% { transform: translate(calc(var(--fx) * 45%), calc(var(--fy) * 45%)); } }
        @keyframes ccPop { 0% { transform: scale(1); } 40% { transform: scale(1.25); filter: brightness(1.6); } 100% { transform: scale(0); opacity: 0; } }
        @keyframes ccHint { 0%, 100% { transform: none; } 25% { transform: rotate(-9deg) scale(1.06); } 75% { transform: rotate(9deg) scale(1.06); } }
        @keyframes ccFloat { from { transform: translate(-50%, -50%); opacity: 1; } to { transform: translate(-50%, -160%); opacity: 0; } }
        @keyframes ccPraise { from { transform: scale(.3) rotate(-8deg); opacity: 0; } to { transform: none; opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          [role="grid"] * { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
        }
      `}</style>
    </div>
  );
}
