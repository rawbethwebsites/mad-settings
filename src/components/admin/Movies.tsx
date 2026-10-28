'use client';

// Admin: put up the movie list (paste it or upload a .txt / .csv), open voting, watch the count.
import { useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

type Run = (fn: () => Promise<unknown>, ok?: string) => Promise<void>;
const input = 'p-2 border-[3px] border-brand-black bg-white font-body';
const btn = 'admin-lift px-3 py-2 poster-border font-display font-black uppercase text-sm disabled:opacity-40';

// One title per line; for a CSV take the first column and skip a "title" header
export function parseList(text: string) {
  return text.split(/\r?\n/)
    .map(line => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)[0] ?? '')
    .map(cell => cell.replace(/^\s*\d+[.)]\s+/, '').replace(/^"|"$/g, '').replace(/""/g, '"').trim())
    .filter((t, i) => t && !(i === 0 && /^(title|movie|movies|name)$/i.test(t)));
}

export default function Movies({ me, run }: { me: string; run: Run }) {
  const board = useQuery(api.movies.board, { playerKey: me });
  const addList = useMutation(api.movies.addList);
  const remove = useMutation(api.movies.remove);
  const setOpen = useMutation(api.movies.setOpen);
  const reset = useMutation(api.movies.reset);
  const [text, setText] = useState('');
  const titles = parseList(text);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 200_000) { void run(async () => { throw new Error('That file is too big. Use a plain list of titles.'); }); return; }
    const body = await file.text();
    setText(t => (t.trim() ? `${t.trim()}\n` : '') + body);
  };

  if (!board) return <div className="h-40 poster-border bg-white admin-shimmer" aria-label="Loading movies" />;
  const top = board.movies[0];

  return (
    <>
      <section className="admin-rise p-4 poster-border poster-shadow bg-brand-black text-brand-cream mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 font-display font-bold text-xs uppercase tracking-widest">
              <span className={`w-2.5 h-2.5 rounded-full ${board.open ? 'bg-brand-acid admin-live' : 'bg-brand-coral'}`} aria-hidden="true" />
              Voting is {board.open ? 'open' : 'closed'}
            </div>
            <div className="font-display font-black text-3xl uppercase mt-1">{board.total} vote{board.total === 1 ? '' : 's'} · {board.movies.length} movie{board.movies.length === 1 ? '' : 's'}</div>
            {top && top.votes > 0 && <div className="font-body text-sm opacity-80 mt-1">Leading: <b>{top.title}</b> ({top.votes})</div>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!board.movies.length && !board.open}
              className={`${btn} ${board.open ? 'bg-brand-coral text-brand-black' : 'bg-brand-acid text-brand-black'}`}
              onClick={() => run(() => setOpen({ playerId: me, open: !board.open }), board.open ? 'Voting closed.' : 'Voting is open. Campers can vote now.')}>
              {board.open ? '⏸ Close voting' : '▶ Open voting'}
            </button>
            <Link href="/movies" target="_blank" className={`${btn} bg-white text-brand-black`}>See camper page ↗</Link>
          </div>
        </div>
      </section>

      <section className="admin-rise p-4 poster-border poster-shadow bg-white mb-5">
        <h2 className="font-display font-black text-lg uppercase mb-1">Add movies</h2>
        <p className="font-body text-sm mb-3">Paste one movie per line, or upload a .txt or .csv file. Movies already on the list are skipped.</p>
        <textarea className={`${input} block w-full`} rows={6} value={text} onChange={e => setText(e.target.value)}
          placeholder={'The Wedding Party\nKing of Boys\nBlack Panther'} aria-label="Movie titles, one per line" />
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <label className={`${btn} bg-white cursor-pointer`}>
            📄 Upload list
            <input type="file" accept=".txt,.csv,text/plain,text/csv" className="sr-only" onChange={onFile} />
          </label>
          <button type="button" className={`${btn} bg-brand-acid`} disabled={!titles.length}
            onClick={() => run(async () => {
              const r = await addList({ playerId: me, titles });
              setText('');
              return r;
            }, 'Movies added. Any already on the list were skipped.')}>
            Add {titles.length || ''} movie{titles.length === 1 ? '' : 's'}
          </button>
        </div>
      </section>

      <section className="admin-rise p-4 poster-border poster-shadow bg-white mb-5">
        <h2 className="font-display font-black text-lg uppercase mb-3">The list</h2>
        {!board.movies.length && <p className="font-body">No movies yet. Add some above.</p>}
        <ul className="space-y-2">
          {board.movies.map((m, i) => (
            <li key={m.id} className="admin-slide flex items-center gap-3 p-2 border-2 border-brand-black/15">
              <span className="w-6 font-display font-black text-brand-black/40">{i + 1}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-display font-black uppercase truncate">{m.title}</span>
                <span className="block h-2 bg-brand-black/10 mt-1 overflow-hidden">
                  <span className="block h-full bg-brand-purple transition-[width] duration-500" style={{ width: `${board.total ? (m.votes / board.total) * 100 : 0}%` }} />
                </span>
              </span>
              <span className="font-display font-black tabular-nums w-10 text-right">{m.votes}</span>
              <button type="button" className={`${btn} bg-white`} aria-label={`Remove ${m.title}`}
                onClick={() => { if (confirm(`Take "${m.title}" off the list? Its votes go too.`)) void run(() => remove({ playerId: me, movieId: m.id }), 'Removed.'); }}>✕</button>
            </li>
          ))}
        </ul>
        {!!board.movies.length && (
          <div className="flex flex-wrap gap-2 mt-4">
            <button type="button" className={`${btn} bg-white`} disabled={!board.total}
              onClick={() => { if (confirm('Wipe every vote and start the count again? The list stays.')) void run(() => reset({ playerId: me, list: false }), 'Votes reset.'); }}>Reset votes</button>
            <button type="button" className={`${btn} bg-brand-coral`}
              onClick={() => { if (confirm('Clear the whole list and every vote, ready for a new night?')) void run(() => reset({ playerId: me, list: true }), 'List cleared.'); }}>Clear list</button>
          </div>
        )}
      </section>
    </>
  );
}
