'use client';

import { useEffect, useRef } from 'react';
import { buzz, play } from './sfx';

/** One cue per displayed second; urgent replaces the tick at three seconds. */
export function useCountdownSounds(seconds: number | null, round: string | number) {
  const previous = useRef<{ round: string | number; seconds: number | null } | null>(null);
  useEffect(() => {
    const old = previous.current;
    previous.current = { round, seconds };
    if (seconds === null || seconds < 1 || seconds > 5) return;
    if (old?.round === round && old.seconds === seconds) return;
    if (seconds === 3) {
      play('urgent');
      buzz([40, 60, 40]);
    } else {
      play('tick');
    }
  }, [seconds, round]);
}

export function useResultSound(tone: 'win' | 'lose' | 'draw' | null, round: string | number = 'result') {
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (!tone) { previous.current = null; return; }
    const key = `${round}:${tone}`;
    if (previous.current === key) return;
    previous.current = key;
    play(tone === 'draw' ? 'turn' : tone);
    if (tone === 'win') buzz([40, 60, 80]);
  }, [tone, round]);
}

export function useTurnSound(yourTurn: boolean, round: string | number) {
  const previous = useRef<{ yourTurn: boolean; round: string | number } | null>(null);
  useEffect(() => {
    const old = previous.current;
    previous.current = { yourTurn, round };
    if (yourTurn && (!old?.yourTurn || old.round !== round)) {
      play('turn');
      buzz(35);
    }
  }, [yourTurn, round]);
}
