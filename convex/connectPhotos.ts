import { ConvexError, v } from 'convex/values';
import { internalQuery, internalMutation } from './_generated/server';
import { active, mayViewPhotos, photoModerator } from './connectLib';

export const validUpload = internalQuery({ args: { ticket: v.string() }, handler: async (ctx, { ticket }) => {
  const id = ctx.db.normalizeId('connectUploads', ticket);
  const upload = id ? await ctx.db.get(id) : null;
  const p = upload ? await ctx.db.get(upload.profileId) : null;
  return !!upload && !upload.used && !upload.storageId && upload.expiresAt > Date.now() && !!p && active(p) && p.photos.length < 4;
} });
export const registerUpload = internalMutation({ args: { ticket: v.string(), storageId: v.id('_storage') }, handler: async (ctx, { ticket, storageId }) => {
  const id = ctx.db.normalizeId('connectUploads', ticket);
  const upload = id ? await ctx.db.get(id) : null;
  const p = upload ? await ctx.db.get(upload.profileId) : null;
  if (!upload || upload.used || upload.storageId || upload.expiresAt <= Date.now() || !p || !active(p) || p.photos.length >= 4) throw new ConvexError('This photo upload expired. Try again.');
  await ctx.db.patch(upload._id, { storageId }); return null;
} });
export const validPhoto = internalQuery({ args: { ticket: v.string() }, handler: async (ctx, { ticket }) => {
  const id = ctx.db.normalizeId('connectPhotoTickets', ticket);
  const t = id ? await ctx.db.get(id) : null;
  if (!t || t.expiresAt <= Date.now()) return null;
  const p = await ctx.db.get(t.profileId);
  if (!p || !await mayViewPhotos(ctx.db, t.requester, p)) return null;
  const photo = p.photos.find(p => p.storageId === t.storageId);
  if (!photo || (photo.status !== 'approved' && p.playerId !== t.requester && !await photoModerator(ctx.db, t.requester))) return null;
  return t.storageId;
} });
export const expirePhoto = internalMutation({ args: { ticket: v.id('connectPhotoTickets') }, handler: async (ctx, { ticket }) => {
  const t = await ctx.db.get(ticket);
  if (t && t.expiresAt <= Date.now()) await ctx.db.delete(ticket);
} });
export const expireUpload = internalMutation({ args: { ticket: v.id('connectUploads') }, handler: async (ctx, { ticket }) => {
  const t = await ctx.db.get(ticket);
  if (t && t.expiresAt <= Date.now()) {
    if (t.storageId && !t.used) await ctx.storage.delete(t.storageId);
    await ctx.db.delete(ticket);
  }
} });
