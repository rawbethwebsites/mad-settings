// Movie night vote: admins upload the list and open or close voting; registered campers get one vote each.
import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { DatabaseReader, DatabaseWriter } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { accountByKey, requireAccount, requireStaff } from './walletLib';

const MAX_MOVIES = 60;
const keyOf = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '');

async function settings(db: DatabaseReader) {
  return db.query('movieSettings').withIndex('by_key', q => q.eq('key', 'vote')).unique();
}

async function clearVotes(db: DatabaseWriter, movieId?: Id<'movies'>) {
  const votes = movieId
    ? await db.query('movieVotes').withIndex('by_movie', q => q.eq('movieId', movieId)).collect()
    : await db.query('movieVotes').collect();
  for (const vote of votes) await db.delete(vote._id);
}

// Everything the vote page and the admin tab show, live
export const board = query({
  args: { playerKey: v.string() },
  handler: async (ctx, { playerKey }) => {
    const [movies, votes, row, me] = await Promise.all([
      ctx.db.query('movies').collect(),
      ctx.db.query('movieVotes').collect(),
      settings(ctx.db),
      playerKey.length >= 8 ? accountByKey(ctx.db, playerKey) : null,
    ]);
    const count = new Map<string, number>();
    for (const vote of votes) count.set(vote.movieId, (count.get(vote.movieId) ?? 0) + 1);
    const mine = me ? votes.find(vote => vote.accountId === me._id) : undefined;
    return {
      open: row?.open ?? false,
      canVote: me?.status === 'approved',
      signedIn: !!me,
      myVote: mine?.movieId ?? null,
      total: votes.length,
      movies: movies
        .map(m => ({ id: m._id, title: m.title, votes: count.get(m._id) ?? 0, createdAt: m.createdAt }))
        .sort((a, b) => b.votes - a.votes || a.createdAt - b.createdAt),
    };
  },
});

// Tap a movie to vote for it, tap it again to take the vote back; tapping another moves your vote
export const vote = mutation({
  args: { playerKey: v.string(), movieId: v.id('movies') },
  handler: async (ctx, { playerKey, movieId }) => {
    const a = await requireAccount(ctx.db, playerKey);
    if (!(await settings(ctx.db))?.open) throw new ConvexError('Voting is closed right now.');
    if (!(await ctx.db.get(movieId))) throw new ConvexError('That movie was taken off the list.');
    const mine = await ctx.db.query('movieVotes').withIndex('by_account', q => q.eq('accountId', a._id)).unique();
    if (mine?.movieId === movieId) { await ctx.db.delete(mine._id); return null; }
    if (mine) await ctx.db.patch(mine._id, { movieId, createdAt: Date.now() });
    else await ctx.db.insert('movieVotes', { movieId, accountId: a._id, createdAt: Date.now() });
    return movieId;
  },
});

// ── Admin ─────────────────────────────────────────────────────────────

const staffArg = { playerId: v.string() };

// Add titles from a pasted or uploaded list, skipping blanks and ones already on it
export const addList = mutation({
  args: { ...staffArg, titles: v.array(v.string()) },
  handler: async (ctx, { playerId, titles }) => {
    await requireStaff(ctx.db, playerId, true);
    const existing = await ctx.db.query('movies').collect();
    const seen = new Set(existing.map(m => m.key));
    let added = 0;
    for (const raw of titles.slice(0, 200)) {
      const title = raw.replace(/\s+/g, ' ').trim().slice(0, 80);
      const key = keyOf(title);
      if (!key || seen.has(key)) continue;
      if (existing.length + added >= MAX_MOVIES) throw new ConvexError(`The list holds up to ${MAX_MOVIES} movies. Added ${added}.`);
      seen.add(key);
      await ctx.db.insert('movies', { title, key, createdAt: Date.now() + added });
      added++;
    }
    return { added, skipped: titles.filter(t => t.trim()).length - added };
  },
});

export const remove = mutation({
  args: { ...staffArg, movieId: v.id('movies') },
  handler: async (ctx, { playerId, movieId }) => {
    await requireStaff(ctx.db, playerId, true);
    await clearVotes(ctx.db, movieId);
    if (await ctx.db.get(movieId)) await ctx.db.delete(movieId);
    return null;
  },
});

export const setOpen = mutation({
  args: { ...staffArg, open: v.boolean() },
  handler: async (ctx, { playerId, open }) => {
    await requireStaff(ctx.db, playerId, true);
    const row = await settings(ctx.db);
    if (row) await ctx.db.patch(row._id, { open });
    else await ctx.db.insert('movieSettings', { key: 'vote', open });
    return null;
  },
});

// Start a fresh vote: keep the list, wipe the votes; or wipe the list too for a new night
export const reset = mutation({
  args: { ...staffArg, list: v.boolean() },
  handler: async (ctx, { playerId, list }) => {
    await requireStaff(ctx.db, playerId, true);
    await clearVotes(ctx.db);
    if (list) for (const m of await ctx.db.query('movies').collect()) await ctx.db.delete(m._id);
    return null;
  },
});
