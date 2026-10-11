"use client";

import { useEffect } from "react";

const IDLE_MS = 5000;
const MAX_SPEED = 55; // px per second
const EASE_IN_MS = 1500;

/**
 * Tour mode: once the visitor goes quiet, the page drifts down on its own so the
 * camp plays like a film. Any mouse, touch, wheel or key input hands control back.
 */
export default function AutoScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let idleTimer = 0;
    let frame = 0;
    let startedAt = 0;
    let last = 0;
    let carry = 0;

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
      carry += (MAX_SPEED * ease * ease * dt) / 1000;
      const whole = Math.floor(carry);
      if (whole > 0) {
        carry -= whole;
        window.scrollTo(0, window.scrollY + whole);
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
