'use client';

import { useState, useEffect, useRef } from 'react';
import { Btn, Label, Panel, Result } from '@/components/arcade/ui';
import { CardChoice, CardGameTable } from '@/components/cards/Table';
import { COLOUR, KIND_LABEL, OchoBack, OchoFront } from '@/components/cards/OchoCard';
import type { OnlineProps } from '@/lib/rules/types';
import {
  aiTurn,
  canPlay,
  COLORS,
  deal,
  drawOne as draw,
  play,
  ocho,
  type Color,
  type OchoAction,
  type OchoView,
  type State,
} from '@/lib/rules/ocho';

const viewCanPlay = (view: OchoView, c: OchoView['hand'][number]) =>
  c.kind === 'wild' || c.kind === 'wild4' || c.color === view.color ||
  (c.kind === 'num' && view.top.kind === 'num' ? c.n === view.top.n : c.kind !== 'num' && c.kind === view.top.kind);

function OchoTable({ view, seat, names, busy, picking, error, onPlay, onDraw, onChoose, onCancel }: {
  view: OchoView; seat: number | null; names: string[]; busy?: boolean;
  picking: number | null; error?: string | null; onPlay: (i: number) => void;
  onDraw: () => void; onChoose: (color: Color) => void; onCancel: () => void;
}) {
  const myTurn = seat !== null && seat === view.turn && view.winner === null;
  return <>
    <CardGameTable game="ocho" names={names} seat={seat} counts={view.handCounts}
      turn={view.turn} winner={view.winner} marketCount={view.marketCount}
      topKey={`${view.top.color}-${view.top.kind}-${view.top.n}`} topFace={<OchoFront card={view.top} />}
      backFace={<OchoBack />} match={<><span style={{ width: 10, height: 10, borderRadius: '50%', background: COLOUR[view.color], border: '1px solid #ffedce' }} />{view.color} · {view.dir === 1 ? '↻' : '↺'}</>}
      log={view.log} busy={busy} choosing={picking !== null} error={error} onPlay={onPlay} onDraw={onDraw}
      hand={view.hand.map(c => ({
        id: `${c.color}-${c.kind}-${c.n}`, label: `${c.color ?? 'wild'} ${c.kind === 'num' ? c.n : KIND_LABEL[c.kind]}`,
        front: <OchoFront card={c} />, playable: myTurn && viewCanPlay(view, c),
      }))} />
    {picking !== null && <CardChoice title="Choose a colour" onCancel={onCancel}
      options={COLORS.map(color => ({ value: color, label: color, color: COLOUR[color] }))}
      onChoose={color => onChoose(color as Color)} />}
  </>;
}

export default function Ocho({ award }: { award: (n: number) => void }) {
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
          Match the colour or the number and be first to empty your hand. Shout <b>OCHO!</b> when you&apos;re down to one.
        </p>
        <ul className="font-body text-sm mb-5 space-y-1 list-disc pl-5">
          <li><b>⊘</b> skips the next player · <b>⇄</b> reverses the direction</li>
          <li><b>+2</b> makes the next player pick up two</li>
          <li><b>W</b> wild — choose the colour · <b>+4</b> wild, next player picks four</li>
        </ul>
        <Label>OPPONENTS</Label>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[1, 2, 3].map(n => (
            <Btn key={n} variant={opponents === n ? 'primary' : 'light'} onClick={() => setOpponents(n)}>{n}</Btn>
          ))}
        </div>
        <Btn className="w-full" onClick={() => setS(deal(['You', ...Array.from({ length: opponents }, (_, k) => `Computer ${k + 1}`)]))}>DEAL →</Btn>
      </Panel>
    );
  }

  const myTurn = s.turn === 0 && s.winner === null;
  const view = ocho.view(s, 0);

  const tap = (i: number) => {
    if (!myTurn || picking !== null) return;
    const c = s.hands[0][i];
    if (!canPlay(s, c)) return;
    if (!c.color) { setPicking(i); return; }
    const next = play(s, 0, i, null);
    setS(next);
    settle(next);
  };

  const choose = (color: Color) => {
    if (!myTurn || picking === null) return;
    const next = play(s, 0, picking, color);
    setPicking(null);
    setS(next);
    settle(next);
  };

  const drawCard = () => {
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

      <OchoTable view={view} seat={0} names={s.names} picking={picking}
        onPlay={tap} onDraw={drawCard} onChoose={choose} onCancel={() => setPicking(null)} />
    </div>
  );
}

const errText = (e: unknown) => {
  let m = e instanceof Error ? e.message : String(e);
  if (m.startsWith('Uncaught Error: ')) m = m.slice('Uncaught Error: '.length);
  const nl = m.indexOf('\n');
  return nl === -1 ? m : m.slice(0, nl);
};

export function OchoOnline({ view, seat, names, act }: OnlineProps<OchoView, OchoAction>) {
  const [picking, setPicking] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [lastTurn, setLastTurn] = useState(view.turn);
  if (view.turn !== lastTurn) {
    setLastTurn(view.turn);
    setPicking(null);
  }

  const myTurn = seat !== null && view.turn === seat && view.winner === null;

  const send = async (a: OchoAction) => {
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
    if (!c || !viewCanPlay(view, c)) return;
    if (!c.color) { setPicking(i); return; }
    void send({ type: 'play', idx: i });
  };

  const chooseColor = (color: Color) => {
    if (!myTurn || picking === null || busy) return;
    const i = picking;
    setPicking(null);
    void send({ type: 'play', idx: i, color });
  };

  const drawCard = () => {
    if (!myTurn || busy || picking !== null) return;
    void send({ type: 'draw' });
  };

  return <OchoTable view={view} seat={seat} names={names} busy={busy} error={err} picking={picking}
    onPlay={tap} onDraw={drawCard} onChoose={chooseColor} onCancel={() => setPicking(null)} />;
}