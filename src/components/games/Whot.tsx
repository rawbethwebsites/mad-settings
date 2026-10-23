'use client';

import { useState, useEffect, useRef } from 'react';
import { play as playSound } from '@/lib/sfx';
import { Btn, Label, Panel, Result } from '@/components/arcade/ui';
import { CardChoice, CardGameTable } from '@/components/cards/Table';
import { ShapeIcon, WhotBack, WhotFront } from '@/components/cards/WhotCard';
import type { OnlineProps } from '@/lib/rules/types';
import {
  aiTurn,
  canPlay,
  deal,
  draw,
  playCard,
  SHAPES,
  whot,
  type Shape,
  type State,
  type WhotAction,
  type WhotView,
} from '@/lib/rules/whot';

// Both modes render only the public view, so opponents' faces never enter the DOM.
function WhotTable({ view, seat, names, busy, picking, error, onPlay, onDraw, onChoose, onCancel }: {
  view: WhotView; seat: number | null; names: string[]; busy?: boolean;
  picking: number | null; error?: string | null; onPlay: (i: number) => void;
  onDraw: () => void; onChoose: (shape: Shape) => void; onCancel: () => void;
}) {
  const myTurn = seat !== null && seat === view.turn && view.winner === null;
  const previous = useRef(view);
  useEffect(() => {
    const before = previous.current;
    // Counts catch duplicate WHOT faces and extra turns; forced pickups belong
    // to the same play event, so flip takes precedence over card.
    const played = view.handCounts.some((n, p) => n < before.handCounts[p]);
    const drawn = view.handCounts.some((n, p) => n > before.handCounts[p]);
    if (played) playSound('flip');
    else if (drawn) playSound('card');
    previous.current = view;
  }, [view]);
  return <div data-sfx="none">
    <CardGameTable game="whot" names={names} seat={seat} counts={view.handCounts}
      turn={view.turn} winner={view.winner} marketCount={view.marketCount}
      topKey={`${view.top.shape}-${view.top.n}`} topFace={<WhotFront card={view.top} />}
      backFace={<WhotBack />} match={<><ShapeIcon shape={view.want ?? view.top.shape} size={12} />{view.want ?? view.top.shape}</>}
      log={view.log} busy={busy} choosing={picking !== null} error={error} onPlay={onPlay} onDraw={onDraw}
      hand={view.hand.map(c => ({
        id: `${c.shape}-${c.n}`, label: `${c.shape} ${c.n}`, front: <WhotFront card={c} />,
        playable: myTurn && (c.shape === 'whot' || (view.want ? c.shape === view.want : c.shape === view.top.shape || c.n === view.top.n)),
      }))} />
    {picking !== null && <CardChoice title="Choose a shape" onCancel={() => { playSound('tap'); onCancel(); }}
      options={SHAPES.map(shape => ({ value: shape, label: shape, icon: <ShapeIcon shape={shape} size={22} /> }))}
      onChoose={shape => onChoose(shape as Shape)} />}
  </div>;
}

export default function Whot({ award }: { award: (n: number) => void }) {
  const [opponents, setOpponents] = useState(1);
  const [s, setS] = useState<State | null>(null);
  const [picking, setPicking] = useState<number | null>(null);
  const [points, setPoints] = useState(0);
  const awardRef = useRef(award);
  useEffect(() => { awardRef.current = award; }, [award]);

  const settle = (next: State) => {
    if (next.winner === null) return;
    const pts = next.winner === 0 ? 40 + opponents * 20 : 0;
    award(pts);
    setPoints(pts);
  };

  useEffect(() => {
    if (!s || s.winner !== null || s.turn === 0) return;
    const t = setTimeout(() => {
      const next = aiTurn(s);
      setS(next);
      if (next.winner !== null) {
        const pts = next.winner === 0 ? 40 + opponents * 20 : 0;
        awardRef.current(pts);
        setPoints(pts);
      }
    }, 900);
    return () => clearTimeout(t);
  }, [s, opponents]);

  if (!s) {
    return (
      <Panel>
        <p className="font-body text-lg mb-4">
          Nigeria&apos;s favourite card game. Match the shape or number and empty your hand first.
        </p>
        <ul className="font-body text-sm mb-5 space-y-1 list-disc pl-5">
          <li><b>1</b> Hold on — play again</li>
          <li><b>2</b> Pick two · <b>5</b> Pick three</li>
          <li><b>8</b> Suspension — next player misses a turn</li>
          <li><b>14</b> General market — everyone else picks one</li>
          <li><b>WHOT 20</b> — wild, you choose the shape</li>
        </ul>
        <Label>OPPONENTS</Label>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[1, 2, 3].map(n => (
            <Btn key={n} variant={opponents === n ? 'primary' : 'light'} onClick={() => setOpponents(n)}>{n}</Btn>
          ))}
        </div>
        <Btn data-sfx="none" className="w-full" onClick={() => { setS(deal(['You', ...Array.from({ length: opponents }, (_, k) => `Computer ${k + 1}`)])); playSound('card'); }}>DEAL →</Btn>
      </Panel>
    );
  }

  const myTurn = s.turn === 0 && s.winner === null;
  const view = whot.view(s, 0);

  const tap = (i: number) => {
    if (!myTurn || picking !== null) return;
    const c = s.hands[0][i];
    if (!canPlay(s, c)) return;
    if (c.shape === 'whot') { setPicking(i); return; }
    const next = playCard(s, 0, i, null);
    setS(next);
    settle(next);
  };

  const chooseShape = (shape: Shape) => {
    if (!myTurn || picking === null) return;
    const next = playCard(s, 0, picking, shape);
    setPicking(null);
    setS(next);
    settle(next);
  };

  const market = () => {
    if (!myTurn || picking !== null) return;
    setS(draw(s, 0));
  };

  const reset = () => { setS(null); setPicking(null); setPoints(0); };
  const name = (p: number) => s.names[p];

  return (
    <div className="space-y-4">
      {s.winner !== null && (
        <Result
          tone={s.winner === 0 ? 'win' : 'lose'}
          emoji={s.winner === 0 ? '🏆' : '🤖'}
          title={s.winner === 0 ? 'YOU WIN!' : `${name(s.winner).toUpperCase()} WINS`}
          points={points}
          onAgain={reset}
        />
      )}

      <WhotTable view={view} seat={0} names={s.names} picking={picking}
        onPlay={tap} onDraw={market} onChoose={chooseShape} onCancel={() => setPicking(null)} />
    </div>
  );
}

const errText = (e: unknown) => {
  let m = e instanceof Error ? e.message : String(e);
  if (m.startsWith('Uncaught Error: ')) m = m.slice('Uncaught Error: '.length);
  const nl = m.indexOf('\n');
  return nl === -1 ? m : m.slice(0, nl);
};

export function WhotOnline({ view, seat, names, act }: OnlineProps<WhotView, WhotAction>) {
  const [picking, setPicking] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [lastTurn, setLastTurn] = useState(view.turn);
  if (view.turn !== lastTurn) {
    setLastTurn(view.turn);
    setPicking(null);
  }

  const myTurn = seat !== null && view.turn === seat && view.winner === null;

  const send = async (a: WhotAction) => {
    setErr(null);
    setBusy(true);
    try {
      await act(a);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const tap = (i: number) => {
    if (!myTurn || busy || picking !== null) return;
    const c = view.hand[i];
    if (!c || !(c.shape === 'whot' || (view.want ? c.shape === view.want : c.shape === view.top.shape || c.n === view.top.n))) return;
    if (c.shape === 'whot') { setPicking(i); return; }
    void send({ type: 'play', idx: i });
  };

  const chooseShape = (shape: Shape) => {
    if (!myTurn || picking === null || busy) return;
    const i = picking;
    setPicking(null);
    void send({ type: 'play', idx: i, shape });
  };

  return <div data-online-board="whot" className="[&_.card-table-kicker]:hidden! [&_.card-opponent-name]:hidden! [&_.card-opponent]:border-0! [&_.card-opponent]:bg-transparent! [&_.card-opponent]:p-0! [&_.card-opponents]:mb-2! [&_.card-hand-heading_strong]:hidden! [&_.card-hand-heading]:justify-end! [&_.card-hand-tip]:hidden! [&_.card-log]:min-h-0! [&_.card-log]:my-2!">
    <WhotTable view={view} seat={seat} names={names} busy={busy} error={err} picking={picking}
      onPlay={tap} onDraw={() => { if (myTurn && !busy && picking === null) void send({ type: 'draw' }); }}
      onChoose={chooseShape} onCancel={() => setPicking(null)} />
  </div>;
}