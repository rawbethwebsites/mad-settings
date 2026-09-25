'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPlayer, createRoom, getRoomCode, AVATARS } from '@/lib/player';

export default function JoinPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'join' | 'host'>('join');
  const [error, setError] = useState('');

  useEffect(() => {
    // Pre-fill room code if one exists
    const existing = getRoomCode();
    if (existing) setRoomCode(existing);
  }, []);

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Enter your name first');
      return;
    }
    if (!avatar) {
      setError('Pick an avatar');
      return;
    }

    let code = roomCode;
    if (mode === 'host') {
      code = createRoom();
    } else if (!code.trim()) {
      setError('Enter a room code');
      return;
    }

    createPlayer(name.trim(), avatar, code);
    router.push('/games');
  };

  return (
    <main className="min-h-screen bg-brand-cream flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display font-black text-5xl md:text-6xl uppercase italic text-brand-black">
            JOIN THE<br />
            <span className="text-brand-purple">GAMES</span>
          </h1>
          <p className="mt-4 font-body text-lg text-brand-black/60">
            Your phone is your controller.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('join')}
            className={`flex-1 py-3 font-display font-black uppercase text-sm tracking-wider poster-border transition-all ${
              mode === 'join' ? 'bg-brand-purple text-brand-cream poster-shadow' : 'bg-brand-cream text-brand-black'
            }`}
          >
            JOIN GAME
          </button>
          <button
            onClick={() => setMode('host')}
            className={`flex-1 py-3 font-display font-black uppercase text-sm tracking-wider poster-border transition-all ${
              mode === 'host' ? 'bg-brand-purple text-brand-cream poster-shadow' : 'bg-brand-cream text-brand-black'
            }`}
          >
            HOST GAME
          </button>
        </div>

        {/* Form */}
        <div className="space-y-6 p-6 poster-border poster-shadow bg-white">
          {/* Name */}
          <div>
            <label className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50 block mb-2">
              YOUR NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mike"
              maxLength={15}
              className="w-full px-4 py-3 border-4 border-brand-black font-display font-bold text-xl uppercase focus:outline-none focus:bg-brand-acid/20"
            />
          </div>

          {/* Avatar */}
          <div>
            <label className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50 block mb-2">
              PICK YOUR AVATAR
            </label>
            <div className="grid grid-cols-8 gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
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

          {/* Room code */}
          {mode === 'join' ? (
            <div>
              <label className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50 block mb-2">
                ROOM CODE
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="e.g. MAD7"
                maxLength={4}
                className="w-full px-4 py-3 border-4 border-brand-black font-display font-black text-2xl uppercase text-center tracking-widest focus:outline-none focus:bg-brand-acid/20"
              />
            </div>
          ) : (
            <div className="p-4 bg-brand-acid/20 border-4 border-brand-black text-center">
              <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-black/50 mb-1">
                A ROOM CODE WILL BE GENERATED
              </div>
              <div className="font-display font-black text-xl uppercase text-brand-purple">
                You'll share it with your crew
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-brand-coral/20 border-2 border-brand-coral font-display font-bold text-sm uppercase text-brand-coral text-center">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            className="w-full py-4 bg-brand-purple text-brand-cream font-display font-black uppercase text-xl poster-border poster-shadow hover:-translate-y-1 transition-transform active:translate-y-0"
          >
            ENTER →
          </button>
        </div>
      </div>
    </main>
  );
}