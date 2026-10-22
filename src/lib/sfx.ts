// Game sounds made on the fly with Web Audio: nothing to download or license.
// Muted state is remembered per phone. Sounds only start after the first tap (browser rule).

export type Sfx =
  | 'tap' | 'place' | 'drop' | 'card' | 'flip' | 'capture'
  | 'tick' | 'urgent' | 'turn' | 'invite' | 'win' | 'lose' | 'error';

const MUTE_KEY = 'mad-settings-muted';
let ctx: AudioContext | null = null;
let output: GainNode | null = null;
let unlocked = false;
let fallbackMuted = false;

export function isMuted() {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return fallbackMuted; }
}

export function setMuted(m: boolean) {
  fallbackMuted = m;
  try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch {}
  // Silence even a fanfare that has already been scheduled.
  if (ctx && output) output.gain.setValueAtTime(m ? 0 : 1, ctx.currentTime);
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('mad:mute', { detail: m }));
}

/** Call from a pointer/key gesture, never from a timer or a query effect. */
export function unlockAudio() {
  unlocked = true;
  if (!isMuted()) {
    try { audio(); } catch {}
  }
}

function audio() {
  if (typeof window === 'undefined') return null;
  if (!unlocked && !navigator.userActivation?.hasBeenActive) return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    output = ctx.createGain();
    output.gain.value = isMuted() ? 0 : 1;
    output.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.18, slideTo?: number) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(output!);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(start: number, dur: number, vol = 0.12, highpass = 1200) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  const filter = a.createBiquadFilter();
  const gain = a.createGain();
  filter.type = 'highpass';
  filter.frequency.value = highpass;
  gain.gain.value = vol;
  src.buffer = buf;
  src.connect(filter).connect(gain).connect(output!);
  src.start(t);
}

const SOUNDS: Record<Sfx, () => void> = {
  tap: () => tone(660, 0, 0.06, 'triangle', 0.1),
  place: () => { tone(220, 0, 0.12, 'triangle', 0.22, 140); noise(0, 0.05, 0.05, 2000); },
  drop: () => { tone(180, 0, 0.18, 'sine', 0.25, 90); tone(260, 0.12, 0.08, 'triangle', 0.08); },
  card: () => noise(0, 0.12, 0.14, 2500),
  flip: () => { noise(0, 0.06, 0.1, 3000); tone(900, 0.03, 0.05, 'triangle', 0.05); },
  capture: () => { tone(520, 0, 0.08, 'square', 0.08); tone(780, 0.07, 0.12, 'square', 0.08); },
  tick: () => tone(1200, 0, 0.03, 'square', 0.05),
  urgent: () => { tone(880, 0, 0.08, 'square', 0.1); tone(880, 0.12, 0.08, 'square', 0.1); },
  turn: () => { tone(523, 0, 0.1, 'sine', 0.15); tone(784, 0.09, 0.14, 'sine', 0.15); },
  invite: () => { tone(659, 0, 0.12, 'sine', 0.18); tone(880, 0.12, 0.12, 'sine', 0.18); tone(1047, 0.24, 0.2, 'sine', 0.18); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.25, 'triangle', 0.2)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, i * 0.16, 0.3, 'sawtooth', 0.08)),
  error: () => tone(160, 0, 0.18, 'square', 0.1, 120),
};

export function play(s: Sfx) {
  if (typeof window === 'undefined' || isMuted()) return;
  try {
    if (!audio()) return;
    if (process.env.NODE_ENV === 'development') console.debug('[mad:sfx]', s);
    SOUNDS[s]();
  } catch {}
}

/** Short buzz on phones that support it (pairs with win / turn / urgent) */
export function buzz(ms: number | number[] = 30) {
  if (typeof window === 'undefined' || isMuted()) return;
  try {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.(ms);
  } catch {}
}
