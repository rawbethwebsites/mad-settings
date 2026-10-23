'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { ArrowRight, LogIn, Plus } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { createPlayer, getPlayer, AVATARS } from '@/lib/player';
import { camperId, stripServerError } from '@/lib/camper';

function JoinForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'join' | 'host'>('join');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const createRoom = useMutation(api.rooms.create);
  const joinRoom = useMutation(api.rooms.join);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = getPlayer();
      if (saved) {
        setName(saved.name);
        setAvatar(saved.avatar || AVATARS[0]);
      }
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get('code');
      if (urlCode) setRoomCode(urlCode.toUpperCase().slice(0, 4));
      else if (params.get('mode') === 'host') setMode('host');
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const submit = async () => {
    setError('');
    if (!name.trim()) { setError(mode === 'join' ? 'Type your name, then tap Join.' : 'Type your name, then tap Start a room.'); return; }
    if (mode === 'join' && roomCode.trim().length !== 4) {
      setError('Enter the four-character room code, then tap Join.');
      return;
    }
    setBusy(true);
    try {
      const playerId = camperId();
      const r = mode === 'host'
        ? await createRoom({ playerId, name: name.trim(), avatar })
        : await joinRoom({ playerId, name: name.trim(), avatar, code: roomCode.trim().toUpperCase() });
      createPlayer(name.trim(), avatar, r.code);
      router.push(`/room/${r.code}`);
    } catch (e) {
      const message = stripServerError(e, '');
      setError(mode === 'join' && /room|code/i.test(message)
        ? 'Check the room code with your friend, then tap Join.'
        : mode === 'host' ? 'Could not start a room. Tap Start a room again.' : 'Could not join. Tap Join again.');
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-brand-cream text-brand-black flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <h1 className="text-center mb-6 font-display font-black text-4xl md:text-6xl uppercase italic">
          {mode === 'join' ? 'Join the' : 'Start a'} <span className="text-brand-purple">room</span>
        </h1>
        <form onSubmit={e => { e.preventDefault(); void submit(); }} className="space-y-5 p-5 sm:p-6 poster-border poster-shadow bg-white">
          <div>
            <label htmlFor="player-name" className="font-display font-bold text-sm block mb-2">Your name</label>
            <input id="player-name" name="name" autoComplete="given-name" type="text" value={name}
              onChange={e => setName(e.target.value)} placeholder="e.g. Mike" maxLength={15}
              className="w-full min-h-12 px-4 py-3 border-4 border-brand-black bg-white placeholder:text-brand-black/40 font-display font-bold text-xl focus:outline-none focus:bg-brand-acid/20" />
          </div>
          <fieldset>
            <legend className="font-display font-bold text-sm mb-2">Pick a face</legend>
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
              {AVATARS.map(a => (
                <button key={a} type="button" onClick={() => setAvatar(a)} aria-label={`Pick ${a}`} aria-pressed={avatar === a}
                  className={`min-h-11 min-w-11 text-2xl flex items-center justify-center border-2 transition-colors ${avatar === a ? 'border-brand-purple bg-brand-purple/20' : 'border-brand-black/20 hover:border-brand-black'}`}>
                  {a}
                </button>
              ))}
            </div>
          </fieldset>
          {mode === 'join' && (
            <div>
              <label htmlFor="room-code" className="font-display font-bold text-sm block mb-2">Room code</label>
              <input id="room-code" name="code" autoCapitalize="characters" autoComplete="off" spellCheck={false} type="text" value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())} placeholder="e.g. MAD7" maxLength={4}
                className="w-full min-h-12 px-4 py-3 border-4 border-brand-black bg-white placeholder:text-brand-black/40 font-display font-black text-2xl uppercase text-center tracking-widest focus:outline-none focus:bg-brand-acid/20" />
            </div>
          )}
          {error && <div role="alert" className="p-3 bg-brand-coral/20 border-2 border-brand-coral font-body text-sm text-brand-black text-center">{error}</div>}
          <button type="submit" disabled={busy}
            className="w-full min-h-14 py-4 bg-brand-purple text-brand-cream font-display font-black text-xl poster-border poster-shadow hover:-translate-y-1 transition-transform disabled:opacity-50 flex items-center justify-center gap-2">
            {mode === 'join' ? <LogIn aria-hidden="true" size={22} /> : <Plus aria-hidden="true" size={22} />}
            {busy ? (mode === 'join' ? 'Joining…' : 'Starting…') : mode === 'join' ? 'Join' : 'Start a room'}
          </button>
        </form>
        <button type="button" disabled={busy} onClick={() => { setMode(mode === 'join' ? 'host' : 'join'); setError(''); }}
          className="mt-4 w-full min-h-11 font-display font-bold text-sm flex items-center justify-center gap-2 hover:text-brand-purple disabled:opacity-50">
          {mode === 'join' ? 'Start a room instead' : 'Join a room instead'} <ArrowRight aria-hidden="true" size={18} />
        </button>
      </div>
    </main>
  );
}

export default function JoinPage() {
  return <Suspense><JoinForm /></Suspense>;
}
