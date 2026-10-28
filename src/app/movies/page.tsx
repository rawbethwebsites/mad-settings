'use client';

// Movie night vote: one vote per registered camper, results move live as everyone votes.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { camperId } from '@/lib/camper';
import { serverMessage } from '@/lib/account';
import { buzz, play } from '@/lib/sfx';

export default function MoviesPage() {
  const [key, setKey] = useState('');
  useEffect(() => { const t = setTimeout(() => setKey(camperId()), 0); return () => clearTimeout(t); }, []);
  const board = useQuery(api.movies.board, key ? { playerKey: key } : 'skip');
  const vote = useMutation(api.movies.vote);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const tap = async (id: Id<'movies'>, title: string) => {
    if (!board?.open || !board.canVote || busy) return;
    setBusy(id); setMsg('');
    try {
      const r = await vote({ playerKey: key, movieId: id });
      buzz(30); play(r ? 'win' : 'tap');
      setMsg(r ? `You voted for ${title}.` : 'Vote taken back.');
    } catch (e) { setMsg(serverMessage(e)); play('error'); }
    finally { setBusy(null); }
  };

  const top = board?.movies[0];
  const leader = top && top.votes > 0 && board!.movies.filter(m => m.votes === top.votes).length === 1 ? top.id : null;

  return (
    <main className="min-h-screen bg-brand-black text-brand-cream p-4 md:p-6 relative overflow-hidden">
      <div className="admin-glow absolute -left-24 -top-24 w-72 h-72 rounded-full bg-brand-purple/50 blur-3xl" aria-hidden="true" />
      <div className="admin-glow absolute -right-24 top-1/3 w-64 h-64 rounded-full bg-brand-coral/30 blur-3xl" style={{ animationDelay: '2s' }} aria-hidden="true" />
      <div className="relative max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-5">
          <Link href="/room/CAMP" className="min-h-11 flex items-center font-display font-bold text-sm uppercase">← Camp room</Link>
          <span className="w-16" />
        </div>
        <header className="admin-rise mb-6">
          <div className="text-5xl mb-2" aria-hidden="true">🎬🍿</div>
          <h1 className="font-display font-black text-4xl md:text-5xl uppercase italic leading-none">Movie <span className="text-brand-acid">night</span></h1>
          <p className="font-body mt-2 opacity-80">Pick what we watch. One vote each. Tap again to change your mind.</p>
          {board && (
            <div className="flex flex-wrap gap-2 mt-3 font-display font-black uppercase text-xs">
              <span className={`flex items-center gap-2 px-2 py-1 ${board.open ? 'bg-brand-acid text-brand-black' : 'bg-brand-coral text-brand-black'}`}>
                {board.open && <span className="admin-live w-2 h-2 rounded-full bg-brand-black" aria-hidden="true" />}
                {board.open ? 'Voting open' : 'Voting closed'}
              </span>
              <span className="px-2 py-1 bg-brand-cream/15">{board.total} vote{board.total === 1 ? '' : 's'} in</span>
            </div>
          )}
        </header>

        {board && !board.signedIn && (
          <Link href="/account?mode=login" className="admin-lift block mb-5 p-4 poster-border bg-brand-acid text-brand-black font-display font-black uppercase">
            Log in to your camp account to vote →
          </Link>
        )}
        {board && board.signedIn && !board.canVote && (
          <p className="mb-5 p-3 poster-border bg-brand-coral text-brand-black font-body">Your camp account is on hold, so you can&apos;t vote. Ask camp staff.</p>
        )}
        {msg && <p key={msg} role="status" className="admin-slide mb-4 p-3 poster-border bg-brand-cream text-brand-black font-body">{msg}</p>}

        {board === undefined ? <div className="h-48 poster-border admin-shimmer opacity-20" /> : !board.movies.length ? (
          <p className="p-5 poster-border bg-brand-cream/10 font-body">The movie list isn&apos;t up yet. Check back soon.</p>
        ) : (
          <ul className="space-y-3">
            {board.movies.map((m, i) => {
              const mine = board.myVote === m.id;
              const share = board.total ? Math.round((m.votes / board.total) * 100) : 0;
              const can = board.open && board.canVote;
              return (
                <li key={m.id} className="admin-rise" style={{ animationDelay: `${Math.min(i, 10) * 50}ms` }}>
                  <button type="button" disabled={!can || !!busy} onClick={() => tap(m.id, m.title)} aria-pressed={mine}
                    className={`admin-lift relative w-full text-left overflow-hidden p-4 poster-border ${mine ? 'bg-brand-acid text-brand-black' : 'bg-brand-cream text-brand-black'} ${can ? '' : 'cursor-default'} disabled:opacity-100`}>
                    <span className={`absolute inset-y-0 left-0 transition-[width] duration-700 ease-out ${mine ? 'bg-brand-black/10' : 'bg-brand-purple/15'}`} style={{ width: `${share}%` }} aria-hidden="true" />
                    <span className="relative flex items-center gap-3">
                      <span className="w-7 font-display font-black text-xl text-brand-black/40">{leader === m.id ? '👑' : i + 1}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-display font-black text-lg uppercase leading-tight break-words">{m.title}</span>
                        {mine && <span className="block font-display font-bold text-xs uppercase tracking-widest">✓ Your vote</span>}
                      </span>
                      <span className="text-right">
                        <span key={m.votes} className="admin-pop block font-display font-black text-2xl tabular-nums">{m.votes}</span>
                        <span className="block font-body text-xs opacity-60">{share}%</span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
