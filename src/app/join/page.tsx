'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { createPlayer, getPlayer, AVATARS } from '@/lib/player';
import { camperId, stripServerError } from '@/lib/camper';

function JoinForm() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'join' | 'host'>('join');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const createRoom = useMutation(api.rooms.create);
  const joinRoom = useMutation(api.rooms.join);

  // A saved camper with no live room gets their name and avatar back
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = getPlayer();
      if (saved) {
        setName(saved.name);
        setAvatar(saved.avatar);
      }
      const urlCode = new URLSearchParams(window.location.search).get('code');
      if (urlCode) setRoomCode(urlCode.toUpperCase().slice(0, 4));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router]);

  const submit = async () => {
    setError('');
    if (!name.trim()) { setError('Enter your name first.'); return; }
    if (!avatar) { setError('Pick an avatar.'); return; }
    if (mode === 'join' && !roomCode.trim()) { setError('Enter a room code.'); return; }
    setBusy(true);
    try {
      const playerId = camperId();
      const clean = roomCode.trim().toUpperCase();
      const r =
        mode === 'host'
          ? await createRoom({ playerId, name: name.trim(), avatar })
          : await joinRoom({ playerId, name: name.trim(), avatar, code: clean });
      createPlayer(name.trim(), avatar, r.code);
      router.push(`/room/${r.code}`);
    } catch (e) {
      setError(stripServerError(e));
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-brand-cream text-brand-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display font-black text-5xl md:text-6xl uppercase italic">
            JOIN THE<br />
            <span className="text-brand-purple">GAMES</span>
          </h1>
          <p className="mt-4 font-body text-lg text-brand-black/60">Your phone is your controller.</p>
        </div>

        <div className="flex gap-2 mb-6">
          {(['join', 'host'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`flex-1 py-3 font-display font-black uppercase text-sm tracking-wider poster-border transition-all ${
                mode === m ? 'bg-brand-purple text-brand-cream poster-shadow' : 'bg-brand-cream text-brand-black'
              }`}
            >
              {m === 'join' ? 'JOIN ROOM' : 'HOST ROOM'}
            </button>
          ))}
        </div>

        <div className="space-y-6 p-6 poster-border poster-shadow bg-white">
          <div>
            <label className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50 block mb-2">
              YOUR NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Mike"
              maxLength={15}
              className="w-full px-4 py-3 border-4 border-brand-black bg-white placeholder:text-brand-black/40 font-display font-bold text-xl uppercase focus:outline-none focus:bg-brand-acid/20"
            />
          </div>

          <div>
            <label className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50 block mb-2">
              PICK YOUR AVATAR
            </label>
            <div className="grid grid-cols-8 gap-2">
              {AVATARS.map(a => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  aria-pressed={avatar === a}
                  className={`aspect-square text-2xl flex items-center justify-center border-2 transition-all ${
                    avatar === a
                      ? 'border-brand-purple bg-brand-purple/20 scale-110'
                      : 'border-brand-black/20 hover:border-brand-black hover:scale-105'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {mode === 'join' ? (
            <div>
              <label className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50 block mb-2">
                ROOM CODE
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                placeholder="e.g. MAD7"
                maxLength={4}
                className="w-full px-4 py-3 border-4 border-brand-black bg-white placeholder:text-brand-black/40 font-display font-black text-2xl uppercase text-center tracking-widest focus:outline-none focus:bg-brand-acid/20"
              />
            </div>
          ) : (
            <div className="p-4 bg-brand-acid/20 border-4 border-brand-black text-center">
              <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50 mb-1">
                A ROOM CODE WILL BE GENERATED
              </div>
              <div className="font-display font-black text-xl uppercase text-brand-purple">
                You&apos;ll share it with your crew
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="p-3 bg-brand-coral/20 border-2 border-brand-coral font-display font-bold text-sm uppercase text-brand-coral text-center">
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={busy}
            className="w-full py-4 bg-brand-purple text-brand-cream font-display font-black uppercase text-xl poster-border poster-shadow hover:-translate-y-1 transition-transform disabled:opacity-50"
          >
            {busy ? 'JOINING…' : 'ENTER →'}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinForm />
    </Suspense>
  );
}
