'use client';

// After a game: a poster-style story image of the result, shared through the phone's own share sheet
// (Instagram, Snapchat, WhatsApp, TikTok…), or saved to photos where sharing files isn't supported.
import { createContext, useContext, useEffect, useState } from 'react';
import { getPlayer } from '@/lib/player';

export const GameInfo = createContext<{ title: string; emoji: string } | null>(null);

const SITE = 'madsettings.theboostnation.space';
const W = 1080, H = 1920;
const C = { purple: '#6D28D9', acid: '#BEF264', cream: '#FDFBF7', black: '#0A0A0A', coral: '#FB7185', cyan: '#22D3EE' };

type Tone = 'win' | 'lose' | 'draw';
export interface ShareResult { tone: Tone; emoji: string; headline: string; detail?: string; points?: number }

function fontOf(cls: string) {
  const el = document.createElement('span');
  el.className = cls;
  document.body.appendChild(el);
  const f = getComputedStyle(el).fontFamily;
  el.remove();
  return f || 'system-ui, sans-serif';
}

// Shrinks a line until it fits the width
function fit(ctx: CanvasRenderingContext2D, text: string, max: number, size: number, font: string, weight = 900) {
  let s = size;
  do { ctx.font = `italic ${weight} ${s}px ${font}`; s -= 4; } while (ctx.measureText(text).width > max && s > 24);
}

async function draw(r: ShareResult, game: { title: string; emoji: string }, name: string): Promise<Blob> {
  await document.fonts?.ready;
  const display = fontOf('font-display'), body = fontOf('font-body');
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  const accent = r.tone === 'win' ? C.acid : r.tone === 'lose' ? C.coral : C.cyan;

  // Night sky with a glow, like the camp site
  ctx.fillStyle = C.black; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.8, 260, 40, W * 0.8, 260, 900);
  glow.addColorStop(0, 'rgba(109,40,217,.75)'); glow.addColorStop(1, 'rgba(109,40,217,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  const glow2 = ctx.createRadialGradient(120, H - 300, 20, 120, H - 300, 700);
  glow2.addColorStop(0, 'rgba(251,113,133,.35)'); glow2.addColorStop(1, 'rgba(251,113,133,0)');
  ctx.fillStyle = glow2; ctx.fillRect(0, 0, W, H);
  // Stars
  for (let i = 0; i < 70; i++) {
    const x = (i * 337) % W, y = (i * 571) % 900, s = (i % 3) + 1;
    ctx.fillStyle = `rgba(253,251,247,${0.25 + (i % 5) / 10})`; ctx.fillRect(x, y, s, s);
  }

  // Wordmark
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.cream; ctx.font = `italic 900 120px ${display}`;
  ctx.fillText('MAD', 80, 220);
  ctx.fillStyle = C.acid; ctx.fillText('SETTINGS', 80, 340);
  ctx.fillStyle = 'rgba(253,251,247,.7)'; ctx.font = `700 34px ${display}`;
  ctx.fillText('POP-UP • BONFIRE • SLEEPOVER', 84, 400);

  // The result card: offset black shadow, thick border, poster style
  const x = 80, y = 520, w = W - 160, h = 900;
  ctx.fillStyle = C.purple; ctx.fillRect(x + 24, y + 24, w, h);
  ctx.fillStyle = accent; ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 12; ctx.strokeStyle = C.black; ctx.strokeRect(x, y, w, h);

  ctx.textAlign = 'center';
  ctx.font = `200px ${body}`; ctx.fillStyle = C.black;
  ctx.fillText(r.emoji, W / 2, y + 260);
  fit(ctx, r.headline.toUpperCase(), w - 100, 140, display);
  ctx.fillText(r.headline.toUpperCase(), W / 2, y + 450);
  ctx.font = `800 54px ${display}`;
  ctx.fillText(`${game.emoji} ${game.title.toUpperCase()}`, W / 2, y + 560);
  if (r.detail) {
    ctx.font = `500 40px ${body}`;
    const words = r.detail.split(' '); let line = ''; let ly = y + 650;
    for (const word of words) {
      if (ctx.measureText(`${line}${word} `).width > w - 140) { ctx.fillText(line.trim(), W / 2, ly); line = ''; ly += 52; if (ly > y + 760) break; }
      line += `${word} `;
    }
    if (ly <= y + 760) ctx.fillText(line.trim(), W / 2, ly);
  }
  if (r.points && r.points > 0) {
    ctx.fillStyle = C.black; ctx.fillRect(W / 2 - 200, y + h - 130, 400, 90);
    ctx.fillStyle = accent; ctx.font = `italic 900 60px ${display}`;
    ctx.fillText(`+${r.points} PTS`, W / 2, y + h - 62);
  }

  // Who played, and the call to come play
  ctx.fillStyle = C.cream; ctx.font = `italic 900 64px ${display}`;
  fit(ctx, name.toUpperCase(), W - 160, 72, display);
  ctx.fillText(name.toUpperCase(), W / 2, 1560);
  ctx.fillStyle = 'rgba(253,251,247,.75)'; ctx.font = `600 40px ${body}`;
  ctx.fillText('Think you can beat me? Come play.', W / 2, 1630);
  ctx.fillStyle = C.acid; ctx.fillRect(140, 1700, W - 280, 110);
  ctx.lineWidth = 8; ctx.strokeRect(140, 1700, W - 280, 110);
  ctx.fillStyle = C.black; ctx.font = `800 42px ${display}`;
  ctx.fillText(SITE, W / 2, 1772);

  return new Promise((res, rej) => cv.toBlob(b => (b ? res(b) : rej(new Error('Could not make the image'))), 'image/png'));
}

export default function ShareCard({ result }: { result: ShareResult }) {
  const game = useContext(GameInfo) ?? { title: 'MAD SETTINGS', emoji: '🔥' };
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState('');
  const [msg, setMsg] = useState('');
  const text = `${result.headline} at ${game.title} 🔥 MAD SETTINGS camp. Come play: https://${SITE}`;

  useEffect(() => {
    let gone = false, made = '';
    draw(result, game, getPlayer()?.name || 'A camper').then(b => {
      if (gone) return;
      made = URL.createObjectURL(b);
      setBlob(b); setUrl(made);
    }).catch(() => {});
    return () => { gone = true; if (made) URL.revokeObjectURL(made); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.headline, result.tone, result.points, result.detail]);

  const save = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url; a.download = `mad-settings-${game.title.toLowerCase().replace(/\W+/g, '-')}.png`; a.click();
    setMsg('Saved. Post it from your photos.');
  };
  const share = async () => {
    if (!blob) return;
    const file = new File([blob], 'mad-settings.png', { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    try {
      if (nav.canShare?.({ files: [file] })) await nav.share({ files: [file], text });
      else if (nav.share) await nav.share({ text, url: `https://${SITE}` });
      else save();
    } catch { /* closed the share sheet */ }
  };

  return (
    <div className="mt-4 text-left">
      <div className="flex gap-3 items-stretch">
        {url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={url} alt="Your result card" className="w-24 shrink-0 aspect-[9/16] object-cover border-4 border-brand-black shadow-[4px_4px_0_0_#0A0A0A] admin-rise" />
          : <div className="w-24 shrink-0 aspect-[9/16] border-4 border-brand-black admin-shimmer" />}
        <div className="flex-1 grid gap-2">
          <button type="button" onClick={share} disabled={!blob}
            className="admin-lift poster-border bg-brand-purple text-brand-cream font-display font-black uppercase py-3 disabled:opacity-50">
            📤 Share my result
          </button>
          <div className="grid grid-cols-2 gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"
              className="admin-lift poster-border bg-[#25D366] text-brand-black font-display font-black uppercase text-xs py-2 text-center">WhatsApp</a>
            <button type="button" onClick={save} disabled={!blob}
              className="admin-lift poster-border bg-white font-display font-black uppercase text-xs py-2 disabled:opacity-50">Save image</button>
          </div>
          <p className="font-body text-xs text-brand-black/70">{msg || 'Post it to your Instagram, Snapchat or TikTok story.'}</p>
        </div>
      </div>
    </div>
  );
}
