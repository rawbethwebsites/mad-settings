'use client';

import { useEffect, useSyncExternalStore, type MouseEvent } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { isMuted, play, setMuted, unlockAudio } from '@/lib/sfx';

function subscribe(onChange: () => void) {
  const sync = () => onChange();
  window.addEventListener('mad:mute', sync);
  window.addEventListener('storage', sync);
  return () => {
    window.removeEventListener('mad:mute', sync);
    window.removeEventListener('storage', sync);
  };
}

/** Generic controls tap once; gameplay areas supply their own semantic sound. */
export function buttonTap(event: MouseEvent<HTMLElement>) {
  if (event.defaultPrevented || !(event.target instanceof Element)) return;
  const button = event.target.closest('button');
  if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
  if (button.closest('[data-sfx="none"]')) return;
  play('tap');
}

export default function SoundToggle() {
  const muted = useSyncExternalStore(subscribe, isMuted, () => false);
  useEffect(() => {
    window.addEventListener('pointerdown', unlockAudio, { capture: true });
    window.addEventListener('keydown', unlockAudio, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio, { capture: true });
      window.removeEventListener('keydown', unlockAudio, { capture: true });
    };
  }, []);

  return (
    <button
      type="button"
      data-sfx="none"
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      aria-pressed={muted}
      title={muted ? 'Sound off' : 'Sound on'}
      onClick={() => {
        setMuted(!muted);
        if (muted) { unlockAudio(); play('tap'); }
      }}
      className="poster-border bg-white w-11 h-11 shrink-0 flex items-center justify-center hover:bg-brand-acid focus-visible:outline-4 focus-visible:outline-brand-purple"
    >
      {muted ? <VolumeX size={20} aria-hidden="true" /> : <Volume2 size={20} aria-hidden="true" />}
    </button>
  );
}
