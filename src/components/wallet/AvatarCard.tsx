'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { serverMessage } from '@/lib/account';
import {
  AVATAR_HAIR, AVATAR_PANTS, AVATAR_SHIRTS, AVATAR_SKIN, HAIR_NAMES, SHOUT_MAX, startingLook,
  type AvatarHair, type AvatarLook, type Gender,
} from '@/data/avatar';

const swatch = 'size-10 rounded-full border-[3px] shrink-0';

// A flat front view of the 3D camper, so campers see what they picked
export function AvatarPreview({ gender, look }: { gender: Gender; look: AvatarLook }) {
  const skin = AVATAR_SKIN[look.skin];
  const hairColor = look.hair === 'cap' ? '#6D28D9' : '#120c08';
  const w = gender === 'female' ? 0.92 : 1.04;
  return (
    <svg viewBox="0 0 100 160" className="h-40 w-auto" aria-label="Your camp avatar">
      <g transform={`translate(50 0) scale(${w} 1) translate(-50 0)`}>
        <rect x="36" y="98" width="12" height="52" rx="5" fill={AVATAR_PANTS[look.pants]} />
        <rect x="52" y="98" width="12" height="52" rx="5" fill={AVATAR_PANTS[look.pants]} />
        <rect x="30" y="52" width="40" height="52" rx="12" fill={AVATAR_SHIRTS[look.shirt]} stroke="#0A0A0A" strokeOpacity=".15" />
        <rect x="20" y="56" width="10" height="40" rx="5" fill={AVATAR_SHIRTS[look.shirt]} />
        <rect x="70" y="56" width="10" height="40" rx="5" fill={AVATAR_SHIRTS[look.shirt]} />
        <circle cx="25" cy="98" r="5" fill={skin} />
        <circle cx="75" cy="98" r="5" fill={skin} />
      </g>
      <rect x="45" y="42" width="10" height="12" fill={skin} />
      {look.hair === 'afro' && <circle cx="50" cy="26" r="21" fill={hairColor} />}
      {look.hair === 'braids' && [38, 44, 56, 62].map(x => <rect key={x} x={x - 2} y="24" width="4" height="30" rx="2" fill={hairColor} />)}
      <ellipse cx="50" cy="30" rx="14" ry="16" fill={skin} />
      {(look.hair === 'short' || look.hair === 'braids' || look.hair === 'bun') && <path d="M36 28 a14 15 0 0 1 28 0 q-14 -6 -28 0z" fill={hairColor} />}
      {look.hair === 'bun' && <circle cx="50" cy="11" r="7" fill={hairColor} />}
      {look.hair === 'cap' && <><path d="M35 26 a15 14 0 0 1 30 0z" fill={hairColor} /><rect x="48" y="23" width="22" height="4" rx="2" fill={hairColor} /></>}
      <circle cx="45" cy="30" r="1.6" fill="#0b0705" />
      <circle cx="55" cy="30" r="1.6" fill="#0b0705" />
    </svg>
  );
}

export default function AvatarCard({ playerKey, name, gender: g0, look: l0, shout: s0, live }: {
  playerKey: string;
  name: string;
  gender: Gender | null;
  look: AvatarLook | null;
  shout: string;
  live: boolean; // paid campers are shown on the homepage
}) {
  const save = useMutation(api.avatars.save);
  const [gender, setGender] = useState<Gender>(g0 ?? 'female');
  const [look, setLook] = useState<AvatarLook>(l0 ?? startingLook(g0 ?? 'female', name));
  const [shout, setShout] = useState(s0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const pickGender = (next: Gender) => {
    setGender(next);
    if (!AVATAR_HAIR[next].includes(look.hair)) setLook({ ...look, hair: AVATAR_HAIR[next][0] });
  };

  return (
    <section className="p-5 poster-border poster-shadow mb-5 bg-white">
      <h2 className="font-display font-black text-xl uppercase mb-1">Your camp avatar</h2>
      <p className="font-body text-sm text-brand-black/70 mb-4">
        {live ? 'You walk round the camp on the homepage. Write something and it shows above your head.' : 'Once your payment is approved, you walk round the camp on the homepage.'}
      </p>

      <div className="flex gap-4 items-start">
        <div className="shrink-0 rounded-2xl bg-[#1b1430] p-2"><AvatarPreview gender={gender} look={look} /></div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(['female', 'male'] as const).map(x => (
              <button key={x} type="button" aria-pressed={gender === x} onClick={() => pickGender(x)}
                className={`min-h-11 poster-border font-display font-black uppercase text-sm ${gender === x ? 'bg-brand-purple text-brand-cream' : 'bg-white'}`}>
                {x === 'female' ? 'Female' : 'Male'}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {AVATAR_HAIR[gender].map(h => (
              <button key={h} type="button" aria-pressed={look.hair === h} onClick={() => setLook({ ...look, hair: h as AvatarHair })}
                className={`min-h-11 px-3 border-[3px] font-display font-bold text-sm ${look.hair === h ? 'border-brand-purple bg-brand-purple/10' : 'border-brand-black/15'}`}>
                {HAIR_NAMES[h]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {([['Skin', AVATAR_SKIN, 'skin'], ['Top', AVATAR_SHIRTS, 'shirt'], ['Trousers', AVATAR_PANTS, 'pants']] as const).map(([label, colors, k]) => (
        <div key={k} className="mt-4">
          <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50 mb-2">{label}</div>
          <div className="flex flex-wrap gap-2">
            {colors.map((c, i) => (
              <button key={c} type="button" aria-label={`${label} ${i + 1}`} aria-pressed={look[k] === i} onClick={() => setLook({ ...look, [k]: i })}
                className={`${swatch} ${look[k] === i ? 'border-brand-purple ring-2 ring-brand-purple ring-offset-2' : 'border-brand-black/20'}`} style={{ background: c }} />
            ))}
          </div>
        </div>
      ))}

      <label className="block mt-5">
        <span className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50">Your message</span>
        <input value={shout} maxLength={SHOUT_MAX} onChange={e => setShout(e.target.value)} placeholder="Who's bringing the suya? 🔥"
          className="mt-1 w-full p-3 border-[3px] border-brand-black bg-white font-body" />
        <span className="block text-right font-body text-xs text-brand-black/50 mt-1">{shout.length}/{SHOUT_MAX}</span>
      </label>

      <button type="button" disabled={busy}
        onClick={() => { setBusy(true); setNote(''); save({ playerKey, gender, look, shout }).then(() => setNote(live ? 'Saved. Find yourself on the homepage camp.' : 'Saved.')).catch(e => setNote(serverMessage(e))).finally(() => setBusy(false)); }}
        className="mt-2 w-full min-h-12 poster-border bg-brand-acid font-display font-black uppercase disabled:opacity-50">
        {busy ? 'Saving…' : 'Save my avatar'}
      </button>
      {note && <p role="status" className="mt-3 p-3 poster-border bg-brand-cream font-body text-sm">{note}</p>}
    </section>
  );
}
