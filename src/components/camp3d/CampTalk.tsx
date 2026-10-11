"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { TALK_LINES, TALK_ROTATION, TALK_TAGS, type TalkLine } from "@/data/campTalk";

/**
 * Speech bubbles for the campers. People register their head here; the
 * director (inside the canvas) picks who talks and pins the DOM bubble
 * (outside the canvas) above their head every frame.
 */

type Talker = { root: THREE.Object3D; head: THREE.Object3D };

const talkers = new Map<string, Talker>();

export function registerTalker(id: string, talker: Talker) {
  talker.root.userData.talkId = id;
  talkers.set(id, talker);
  return () => {
    talkers.delete(id);
  };
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

const SHOW_MS = 6500;
const GAP_MS = 1400;
const HOVER_HOLD_MS = 4500;

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
  const lastRoomCheck = useRef(0);

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
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onClick, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onClick);
    };
  }, []);

  const say = (id: string, now: number, hold = SHOW_MS) => {
    speaker.current = id;
    speaking.current = true;
    phaseEnds.current = now + hold;
    counter.current += 1;
    bubble.show?.({ key: counter.current, line: nextLine(state.current) });
  };

  const hush = (now: number) => {
    speaker.current = null;
    speaking.current = false;
    phaseEnds.current = now + GAP_MS;
    bubble.show?.(null);
  };

  useFrame(() => {
    const now = performance.now();

    // Hover or tap a camper and they speak up.
    const p = pointer.current;
    if ((p.moved && now - lastHover.current > 160) || p.clicked) {
      lastHover.current = now;
      p.moved = false;
      ndc.set(p.x, p.y);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(
        Array.from(talkers.values(), (t) => t.root),
        true,
      );
      let id: string | undefined;
      for (let o: THREE.Object3D | null = hits[0]?.object ?? null; o && !id; o = o.parent) id = o.userData.talkId;
      if (id && (id !== speaker.current || p.clicked)) say(id, now, HOVER_HOLD_MS + (p.clicked ? 2000 : 0));
      p.clicked = false;
    }

    if (now > phaseEnds.current) {
      if (speaking.current) {
        hush(now);
      } else {
        const candidates: { id: string; dist: number }[] = [];
        talkers.forEach((t, id) => {
          const s = headOnScreen(t, camera, 0.62);
          if (!s.visible) return;
          const at = toScreen(s, size);
          if (roomForBubble(at.x, at.y)) candidates.push({ id, dist: s.dist });
        });
        if (candidates.length) {
          candidates.sort((a, b) => a.dist - b.dist);
          const pickFrom = candidates.slice(0, 4);
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
    const s = headOnScreen(talker, camera, 1.1);
    if (!s.visible) {
      // Walked off-shot: let someone else pick up the conversation.
      if (speaking.current && phaseEnds.current - now > 600) phaseEnds.current = now + 300;
      el.style.opacity = "0";
      return;
    }
    const { x, y } = toScreen(s, size);
    // Page copy scrolled over them: wrap up and hand over to someone in the open.
    if (now - lastRoomCheck.current > 400) {
      lastRoomCheck.current = now;
      if (!roomForBubble(x, y) && phaseEnds.current - now > 300) phaseEnds.current = now + 200;
    }
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
          <div key={said.key} className={`camp-talk camp-talk-${said.line.tag}`}>
            <span className="camp-talk-tag">{TALK_TAGS[said.line.tag]}</span>
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
