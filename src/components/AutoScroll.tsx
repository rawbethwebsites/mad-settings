"use client";

import { useEffect } from "react";
import { talkState } from "@/lib/talkState";

const IDLE_MS = 5000;
const MAX_SPEED = 55; // px per second
const EASE_IN_MS = 1500;
const READING_SPEED = 0.15; // fraction of full speed while a camper is talking

/**
 * Tour mode: once the visitor goes quiet, the page drifts down on its own so the
 * camp plays like a film. Any mouse, touch, wheel or key input hands control back.
 */
export default function AutoScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Phones scroll by touch; drifting on its own fights the finger and feels jerky
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let idleTimer = 0;
    let frame = 0;
    let startedAt = 0;
    let last = 0;
    let carry = 0;
    let pace = 1;

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const step = (now: number) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (window.scrollY >= max - 1) {
        stop();
        return;
      }
      const dt = Math.min(64, now - last);
      last = now;
      const ease = Math.min(1, (now - startedAt) / EASE_IN_MS);
      // Ease almost to a stop while a speech bubble is up, so it can be read.
      const target = talkState.speaking ? READING_SPEED : 1;
      pace += (target - pace) * Math.min(1, dt / 400);
      carry += (MAX_SPEED * ease * ease * pace * dt) / 1000;
      const whole = Math.floor(carry);
      if (whole > 0) {
        carry -= whole;
        window.scrollTo({ top: window.scrollY + whole, behavior: "instant" });
      }
      frame = requestAnimationFrame(step);
    };

    const start = () => {
      if (frame || document.hidden) return;
      startedAt = last = performance.now();
      carry = 0;
      frame = requestAnimationFrame(step);
    };

    const wake = () => {
      stop();
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(start, IDLE_MS);
    };

    const events = ["mousemove", "mousedown", "wheel", "touchstart", "keydown", "pointerdown"] as const;
    events.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    document.addEventListener("visibilitychange", wake);
    wake();

    return () => {
      stop();
      window.clearTimeout(idleTimer);
      events.forEach((e) => window.removeEventListener(e, wake));
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);

  return null;
}
