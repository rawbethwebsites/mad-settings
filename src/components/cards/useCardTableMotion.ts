'use client';

import { useLayoutEffect, useRef, type RefObject } from 'react';
import { gsap } from 'gsap';

type Box = { x: number; y: number; width: number; height: number };
export type TableMotionState = {
  game: 'whot' | 'ocho'; names: string[]; counts: number[]; handKeys: string[];
  turn: number; seat: number | null; winner: number | null; topKey: string; log: string;
};
type Snapshot = TableMotionState & {
  stateKey: string; hand: Map<string, Box>; players: Map<number, Box>; market: Box; scrollX: number; scrollY: number;
};
const box = (el: Element): Box => {
  const { x, y, width, height } = el.getBoundingClientRect();
  return { x, y, width, height };
};

// The same public-view diff drives local and online tables. No hidden hands or rule changes.
export function useCardTableMotion(root: RefObject<HTMLDivElement | null>, state: TableMotionState) {
  const previous = useRef<Snapshot | null>(null);
  const landingAngle = useRef(-3);
  // UI-only updates (busy, opening a picker) must not cancel an in-flight card.
  const stateKey = JSON.stringify(state);

  useLayoutEffect(() => {
    const table = root.current;
    if (!table) return;
    const next = JSON.parse(stateKey) as TableMotionState;
    const market = table.querySelector<HTMLElement>('[data-market-card]');
    const pile = table.querySelector<HTMLElement>('[data-pile-card]');
    if (!market || !pile) return;
    const hand = new Map(Array.from(table.querySelectorAll<HTMLElement>('[data-hand-key]')).map(el => [el.dataset.handKey!, el]));
    const players = new Map(Array.from(table.querySelectorAll<HTMLElement>('[data-player]')).map(el => [Number(el.dataset.player), el]));
    // Strict Mode replays the first layout effect after cleanup. Replay the deal too.
    const old = previous.current?.stateKey === stateKey ? null : previous.current;
    const snapshot: Snapshot = {
      ...next, stateKey, hand: new Map([...hand].map(([id, el]) => [id, box(el)])),
      players: new Map([...players].map(([id, el]) => [id, box(el)])),
      market: box(market), scrollX: window.scrollX, scrollY: window.scrollY,
    };
    previous.current = snapshot;
    pile.style.transform = `rotate(${landingAngle.current}deg)`;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) return;

    const layer = document.createElement('div');
    layer.dataset.cardMotionLayer = next.game;
    layer.setAttribute('aria-hidden', 'true');
    Object.assign(layer.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '90' });
    document.body.append(layer);
    const timeline = gsap.timeline({ onComplete: () => layer.remove() });
    const hidden = new Set<HTMLElement>();
    const fromOld = (b: Box): Box => ({ ...b, x: b.x + (old?.scrollX ?? window.scrollX) - window.scrollX, y: b.y + (old?.scrollY ?? window.scrollY) - window.scrollY });
    const opponentTarget = (p: number): Box => {
      const b = snapshot.players.get(p) ?? box(pile);
      return { x: b.x + b.width / 2 - 14, y: b.y + 22, width: 28, height: 40 };
    };
    const flight = (type: string, from: Box, to: Box, visual: HTMLElement, at: number, flip: boolean, reveal?: HTMLElement, player?: number, angle = 0) => {
      const ghost = document.createElement('div');
      ghost.dataset.cardMotion = type;
      ghost.dataset.targetPlayer = String(player ?? 'pile');
      ghost.dataset.durationMs = '480';
      const clone = visual.cloneNode(true) as HTMLElement;
      Object.assign(clone.style, { width: '100%', height: '100%', opacity: '1', visibility: 'visible', transform: 'none' });
      Object.assign(ghost.style, { position: 'absolute', top: '0', left: '0', width: `${to.width}px`, height: `${to.height}px`, transformOrigin: 'top left', willChange: 'transform' });
      ghost.append(clone);
      layer.append(ghost);
      if (reveal) { gsap.set(reveal, { visibility: 'hidden' }); hidden.add(reveal); }
      const rotator = clone.querySelector<HTMLElement>('[data-card-rotator]');
      if (flip && rotator) {
        gsap.set(rotator, { rotationY: 180 });
        timeline.to(rotator, { rotationY: 0, duration: 0.3, ease: 'power2.inOut' }, at + 0.12);
      }
      timeline.fromTo(ghost,
        { x: from.x, y: from.y, scaleX: from.width / to.width, scaleY: from.height / to.height, rotation: -4 },
        { x: to.x, y: to.y, scaleX: 1, scaleY: 1, rotation: angle, duration: 0.48, ease: 'power2.inOut', onComplete: () => {
          if (reveal) gsap.set(reveal, { visibility: 'visible' });
          ghost.remove();
        } }, at);
    };
    const marketVisual = market.querySelector<HTMLElement>('[data-card]');
    const pileVisual = pile.querySelector<HTMLElement>('[data-card]');

    if (!old && marketVisual) {
      const destinations: Array<{ p: number; el?: HTMLElement; to: Box }> = [];
      next.counts.forEach((count, p) => {
        if (p === next.seat) {
          hand.forEach(el => destinations.push({ p, el, to: box(el) }));
        } else {
          for (let i = 0; i < count; i++) destinations.push({ p, to: opponentTarget(p) });
        }
      });
      destinations.forEach(({ p, el, to }, i) => {
        const visual = el?.querySelector<HTMLElement>('[data-card]') ?? marketVisual;
        flight('deal', box(market), to, visual, i / Math.max(1, destinations.length - 1) * 0.18, !!el, el, p);
      });
    } else if (old && marketVisual && pileVisual) {
      const actor = next.counts.findIndex((count, p) => count < old.counts[p]);
      if (actor !== -1) {
        landingAngle.current = gsap.utils.random(-5, 5);
        pile.style.transform = `rotate(${landingAngle.current}deg)`;
        const removed = old.handKeys.find(id => !next.handKeys.includes(id));
        const source = actor === next.seat && removed ? old.hand.get(removed) : old.players.get(actor);
        const from = fromOld(source ?? old.market);
        const start = actor === next.seat ? from : { x: from.x + from.width / 2 - 14, y: from.y + 22, width: 28, height: 40 };
        flight('play', start, box(pile), pileVisual, 0, actor !== next.seat, pile, undefined, landingAngle.current);
      }
      const incoming = next.handKeys.filter(id => !old.handKeys.includes(id));
      incoming.forEach((id, i) => {
        const el = hand.get(id);
        const visual = el?.querySelector<HTMLElement>('[data-card]');
        if (el && visual) flight(actor === -1 ? 'draw' : 'penalty', box(market), box(el), visual, (actor === -1 ? 0 : 0.18) + i / Math.max(1, incoming.length - 1) * 0.02, true, el, next.seat ?? undefined);
      });
      next.counts.forEach((count, p) => {
        if (p === next.seat) return;
        const gained = count - old.counts[p];
        for (let i = 0; i < gained; i++) {
          flight(actor === -1 ? 'draw' : 'penalty', box(market), opponentTarget(p), marketVisual,
            (actor === -1 ? 0 : 0.18) + i / Math.max(1, gained - 1) * 0.02, false, undefined, p);
        }
      });
    }

    if (!old || old.turn !== next.turn) {
      const active = players.get(next.turn);
      if (active) timeline.fromTo(active, { filter: 'brightness(1.25)' }, { filter: 'brightness(1)', duration: 0.45 }, 0);
    }
    const lastPlayer = next.counts.findIndex((count, p) => count === 1 && old && old.counts[p] !== 1);
    const callout = table.querySelector<HTMLElement>('[data-last-card-callout]');
    if (lastPlayer !== -1 && callout && next.winner === null) {
      callout.textContent = `${next.game === 'ocho' ? 'OCHO!' : 'LAST CARD!'} · ${next.names[lastPlayer]}`;
      timeline.fromTo(callout, { autoAlpha: 0, scale: 0.6, y: 10 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.3, ease: 'back.out(1.7)' }, 0)
        .to(callout, { autoAlpha: 0, duration: 0.18 }, 0.48);
    }
    if (next.winner !== null && old?.winner == null) {
      const glow = table.querySelector<HTMLElement>('[data-winner-glow]');
      if (glow) timeline.fromTo(glow, { autoAlpha: 1, scale: 0.96 }, { autoAlpha: 0, scale: 1.03, duration: 0.68 }, 0);
      const center = box(pile);
      for (let i = 0; i < 24; i++) {
        const spark = document.createElement('span');
        spark.dataset.confettiSpark = '';
        Object.assign(spark.style, { position: 'absolute', width: '6px', height: '9px', borderRadius: '2px', background: ['#edbd68', '#fae5bb', '#9fc47c', '#d56a4a'][i % 4] });
        layer.append(spark);
        timeline.fromTo(spark, { x: center.x + center.width / 2, y: center.y + center.height / 2, opacity: 1 }, {
          x: center.x + center.width / 2 + gsap.utils.random(-135, 135), y: center.y + gsap.utils.random(-110, 180),
          rotation: gsap.utils.random(-270, 270), opacity: 0, duration: 0.68, ease: 'power2.out',
        }, 0);
      }
    }
    const finish = () => { if (reduced.matches) timeline.progress(1); };
    reduced.addEventListener('change', finish);
    // Finishing interrupted tweens prevents invisible cards after rapid taps, rematches or unmount.
    return () => {
      timeline.progress(1).kill();
      hidden.forEach(el => { el.style.visibility = 'visible'; });
      layer.remove();
      reduced.removeEventListener('change', finish);
    };
  }, [root, stateKey]);
}
