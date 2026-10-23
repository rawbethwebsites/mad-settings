import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { internal } from './_generated/api';

const http = httpRouter();
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const answer = (text: string, status: number) => new Response(text, { status, headers: cors });
http.route({ path: '/connect/upload', method: 'OPTIONS', handler: httpAction(async () => new Response(null, { status: 204, headers: cors })) });
http.route({ path: '/connect/upload', method: 'POST', handler: httpAction(async (ctx, req) => {
  const ticket = new URL(req.url).searchParams.get('ticket') ?? '';
  if (!await ctx.runQuery(internal.connectPhotos.validUpload, { ticket })) return answer('Upload expired. Please try again.', 403);
  const mime = req.headers.get('content-type')?.split(';')[0] ?? '';
  const max = 5 * 1024 * 1024;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime) || Number(req.headers.get('content-length') ?? 0) > max) return answer('JPEG, PNG or WebP up to 5 MB only.', 415);
  // Read with a hard cap rather than buffering an unbounded request body.
  const reader = req.body?.getReader();
  if (!reader) return answer('Choose a photo.', 400);
  const chunks: Uint8Array<ArrayBuffer>[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length;
    if (size > max) { await reader.cancel(); return answer('Photos must be no larger than 5 MB.', 413); }
    chunks.push(new Uint8Array(value));
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const c of chunks) { bytes.set(c, offset); offset += c.length; }
  const png = size > 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b);
  const jpeg = size > 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = size > 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (!(mime === 'image/png' && png || mime === 'image/jpeg' && jpeg || mime === 'image/webp' && webp)) return answer('This file is not a supported photo.', 415);
  const storageId = await ctx.storage.store(new Blob([bytes], { type: mime }));
  try { await ctx.runMutation(internal.connectPhotos.registerUpload, { ticket, storageId }); }
  catch { await ctx.storage.delete(storageId); return answer('Upload expired. Please try again.', 403); }
  return new Response(JSON.stringify({ storageId }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
}) });
http.route({ path: '/connect/photo', method: 'GET', handler: httpAction(async (ctx, req) => {
  const ticket = new URL(req.url).searchParams.get('ticket') ?? '';
  const storageId = await ctx.runQuery(internal.connectPhotos.validPhoto, { ticket });
  if (!storageId) return answer('Photo link expired or no longer available.', 403);
  const blob = await ctx.storage.get(storageId);
  if (!blob) return answer('Photo removed.', 404);
  return new Response(blob, { headers: { ...cors, 'Content-Type': blob.type, 'Content-Security-Policy': "default-src 'none'", 'Referrer-Policy': 'no-referrer' } });
}) });
export default http;
