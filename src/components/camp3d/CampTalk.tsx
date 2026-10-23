"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { talkState } from "@/lib/talkState";
import { TALK_LINES, TALK_ROTATION, TALK_TAGS, type TalkLine } from "@/data/campTalk";

/**
 * Speech bubbles for the campers. People register their head here; the
 * director (inside the canvas) picks who talks and pins the DOM bubble
 * (outside the canvas) above their head every frame.
 */

type Talker = { head: THREE.Object3D; line?: () => TalkLine };
type Picker = (raycaster: THREE.Raycaster) => string | undefined;

const talkers = new Map<string, Talker>();
let picker: Picker | null = null;

export function registerTalker(id: string, talker: Talker) {
  talkers.set(id, talker);
  return () => {
    talkers.delete(id);
  };
}

/** The crowd tells the director which camper sits under the pointer. */
export function setTalkPicker(fn: Picker | null) {
  picker = fn;
}

type Said = { key: number; line: TalkLine };

const bubble = {
  el: null as HTMLDivElement | null,
  show: null as ((said: Said | null) => void) | null,
};

// Scratch objects reused every frame.
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const world = new THREE.Vector3();

function headOnScreen(t: Talker, camera: THREE.Camera, margin: number) {
  t.head.getWorldPosition(world);
  world.y += 0.42;
  const dist = world.distanceTo(camera.position);
  world.project(camera);
  const visible = world.z < 1 && Math.abs(world.x) < margin && world.y < 0.8 && world.y > -0.55 && dist < 19;
  return { visible, dist, x: world.x, y: world.y };
}

// Solid page pieces a bubble should never sit on.
const SOLID = "a, button, img, nav, .poster-border, .poster-shadow, .night-rail, .chapter-box";

function busyAt(x: number, y: number) {
  const el = document.elementFromPoint(x, y);
  if (!el) return false;
  if (el.closest(SOLID)) return true;
  // Text blocks are full width, so only the actual lines of text count.
  const text = el.closest("h1, h2, h3, h4, p, li, span, div");
  if (!text || !text.textContent?.trim() || text.childElementCount > 6) return false;
  const range = document.createRange();
  range.selectNodeContents(text);
  return Array.from(range.getClientRects()).some(
    (r) => x >= r.left - 12 && x <= r.right + 12 && y >= r.top - 12 && y <= r.bottom + 12,
  );
}

const BUBBLE_HALF = 135;

/** Is there open sky around this point for a bubble, or would it sit on the page copy? */
function roomForBubble(x: number, y: number) {
  if (y < 150) return false;
  const cx = Math.min(Math.max(x, BUBBLE_HALF + 12), window.innerWidth - BUBBLE_HALF - 12);
  return ![
    [x, y],
    [cx, y - 45],
    [cx - 90, y - 60],
    [cx + 90, y - 60],
    [cx, y - 88],
  ].some(([px, py]) => busyAt(px, py));
}

const toScreen = (s: { x: number; y: number }, size: { width: number; height: number }) => ({
  x: ((s.x + 1) / 2) * size.width,
  y: ((1 - s.y) / 2) * size.height,
});

/** Long enough to read comfortably (~3 words a second), never hanging around. */
function readingTime(line: TalkLine) {
  const words = line.text.split(/\s+/).length + (line.cta ? 2 : 0);
  return Math.min(9000, Math.max(4500, 1800 + words * 330));
}

const GAP_MS = 2800;

function nextLine(state: { turn: number; used: Record<string, number> }) {
  const tag = TALK_ROTATION[state.turn % TALK_ROTATION.length];
  state.turn += 1;
  const lines = TALK_LINES[tag];
  const i = (state.used[tag] = ((state.used[tag] ?? -1) + 1) % lines.length);
  return lines[i];
}

export function TalkDirector() {
  const { camera, size } = useThree();
  const state = useRef({ turn: 0, used: {} as Record<string, number> });
  const speaker = useRef<string | null>(null);
  const phaseEnds = useRef(0);
  const speaking = useRef(false);
  const counter = useRef(0);
  const pointer = useRef<{ x: number; y: number; clicked: boolean; moved: boolean }>({ x: 0, y: 0, clicked: false, moved: false });
  const lastHover = useRef(0);
  const lastSpot = useRef({ x: 0, y: 0 });
  // On phones the page copy fills the screen, so a bubble closes as soon as the camper scrolls
  const scrolled = useRef(false);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
      pointer.current.moved = true;
    };
    const onClick = (e: PointerEvent) => {
      if ((e.target as HTMLElement | null)?.closest("a, button, input")) return;
      onMove(e);
      pointer.current.clicked = true;
    };
    const onScroll = () => {
      if (window.innerWidth < 768) scrolled.current = true;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onClick, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onClick);
    };
  }, []);

  const say = (id: string, now: number, bonus = 0) => {
    const line = talkers.get(id)?.line?.() ?? nextLine(state.current);
    speaker.current = id;
    speaking.current = true;
    talkState.speaking = true;
    phaseEnds.current = now + readingTime(line) + bonus;
    counter.current += 1;
    bubble.show?.({ key: counter.current, line });
  };

  const hush = (now: number) => {
    speaker.current = null;
    speaking.current = false;
    talkState.speaking = false;
    phaseEnds.current = now + GAP_MS;
    bubble.show?.(null);
  };

  useFrame(() => {
    const now = performance.now();
    if (scrolled.current) {
      scrolled.current = false;
      if (speaking.current) hush(now);
      phaseEnds.current = Math.max(phaseEnds.current, now + GAP_MS);
    }

    // Hover or tap a camper and they speak up.
    const p = pointer.current;
    if ((p.moved && now - lastHover.current > 160) || p.clicked) {
      lastHover.current = now;
      p.moved = false;
      ndc.set(p.x, p.y);
      raycaster.setFromCamera(ndc, camera);
      const id = picker?.(raycaster);
      if (id && (id !== speaker.current || p.clicked)) say(id, now, p.clicked ? 1500 : 0);
      p.clicked = false;
    }

    if (now > phaseEnds.current) {
      if (speaking.current) {
        hush(now);
      } else {
        const inView: { id: string; dist: number; x: number; y: number }[] = [];
        talkers.forEach((t, id) => {
          const s = headOnScreen(t, camera, 0.62);
          if (s.visible) inView.push({ id, dist: s.dist, ...toScreen(s, size) });
        });
        inView.sort((a, b) => a.dist - b.dist);
        const candidates = inView.slice(0, 10).filter((c) => roomForBubble(c.x, c.y));
        if (candidates.length) {
          // Real campers with a message get the floor most of the time
          const campers = candidates.filter((c) => talkers.get(c.id)?.line);
          const pickFrom = campers.length && Math.random() < 0.7 ? campers : candidates.slice(0, 4);
          say(pickFrom[Math.floor(Math.random() * pickFrom.length)].id, now);
        } else {
          phaseEnds.current = now + 600;
        }
      }
    }

    const el = bubble.el;
    if (!el) return;
    const talker = speaker.current ? talkers.get(speaker.current) : undefined;
    if (!talker) {
      el.style.opacity = "0";
      return;
    }
    // Once a line starts it stays up for its full reading time. If the camper
    // drifts out of shot, the bubble holds its last spot on screen.
    const s = headOnScreen(talker, camera, 1.1);
    let { x, y } = s.visible ? toScreen(s, size) : lastSpot.current;
    x = Math.min(Math.max(x, 24), size.width - 24);
    y = Math.min(Math.max(y, 150), size.height - 40);
    lastSpot.current = { x, y };
    const shift = Math.min(Math.max(x, BUBBLE_HALF + 12), size.width - BUBBLE_HALF - 12) - x;
    el.style.opacity = "1";
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    el.style.setProperty("--shift", `${shift.toFixed(1)}px`);
  });

  return null;
}

export function TalkBubble() {
  const [said, setSaid] = useState<Said | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bubble.el = ref.current;
    bubble.show = setSaid;
    return () => {
      bubble.el = null;
      bubble.show = null;
    };
  }, []);

  return (
    <div className="camp-talk-layer" aria-live="polite">
      <div ref={ref} className="camp-talk-anchor">
        {said && (
          <div key={said.key} className={`camp-talk camp-talk-${said.line.by ? "camper" : said.line.tag}`}>
            <span className="camp-talk-tag">{said.line.by ? `${said.line.by} says` : TALK_TAGS[said.line.tag]}</span>
            <p>{said.line.text}</p>
            {said.line.cta && (
              <a
                href={said.line.cta.href}
                className="camp-talk-cta"
                {...(said.line.cta.href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}
              >
                {said.line.cta.label} →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
