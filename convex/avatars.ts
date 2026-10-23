// Camper avatars on the homepage camp: each paid camper walks around with their own look,
// and the message they write on My camp shows in a speech bubble (first name only).
import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireAccount, requireStaff, staffRole } from './walletLib';
import { SHOUT_MAX, validLook, type AvatarLook } from '../src/data/avatar';

const ON_SITE = 40;
const firstName = (name: string) => name.split(' ')[0].slice(0, 16);

// Plain words only: no links, phone numbers or emails in public bubbles
function cleanShout(raw: string) {
  const s = raw.replace(/\s+/g, ' ').trim().slice(0, SHOUT_MAX);
  if (/https?:|www\.|\.(com|ng|net|org|io|space)\b|@|\d{7,}/i.test(s)) throw new ConvexError('Keep it to words: no links, emails or phone numbers.');
  return s;
}

export const save = mutation({
  args: {
    playerKey: v.string(),
    gender: v.union(v.literal('male'), v.literal('female')),
    look: v.object({ skin: v.number(), hair: v.string(), shirt: v.number(), pants: v.number(), hairColor: v.optional(v.number()), shape: v.optional(v.string()), top: v.optional(v.string()), bottom: v.optional(v.string()) }),
    shout: v.string(),
  },
  handler: async (ctx, { playerKey, gender, look, shout }) => {
    const a = await requireAccount(ctx.db, playerKey, false);
    if (!validLook(gender, look as AvatarLook)) throw new ConvexError('Pick your look from the options.');
    const message = cleanShout(shout);
    await ctx.db.patch(a._id, { gender, look, shout: message || undefined });
    return null;
  },
});

// Paid campers with an avatar, newest first
export const onSite = query({
  args: {},
  handler: async ctx => {
    const rows = await ctx.db.query('accounts').withIndex('by_created').order('desc').take(500);
    return rows
      .filter(a => a.status === 'approved' && a.gender && a.look)
      .slice(0, ON_SITE)
      .map(a => ({ id: a._id, name: firstName(a.name), gender: a.gender!, look: a.look!, shout: a.shout ?? '', founder: a.founderNo ?? null }));
  },
});

// Staff: see and remove what campers say on the homepage
export const shouts = query({
  args: { playerId: v.string() },
  handler: async (ctx, { playerId }) => {
    if (!(await staffRole(ctx.db, playerId))) return null;
    const rows = await ctx.db.query('accounts').withIndex('by_created').order('desc').take(500);
    return rows.filter(a => a.shout).map(a => ({ id: a._id, name: a.name, phone: a.phone, shout: a.shout! }));
  },
});

export const clearShout = mutation({
  args: { playerId: v.string(), accountId: v.id('accounts') },
  handler: async (ctx, { playerId, accountId }) => {
    await requireStaff(ctx.db, playerId);
    await ctx.db.patch(accountId, { shout: undefined });
    return null;
  },
});
