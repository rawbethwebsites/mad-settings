import { ConvexError } from "convex/values";
import type { DatabaseReader, DatabaseWriter } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ONLINE_MS = 40 * 1000;

export function randomCode() {
  let code = "";
  for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

export function cleanName(name: string) {
  const n = name.trim().slice(0, 24);
  if (n.length < 1) throw new ConvexError("Enter your name.");
  return n;
}

export function cleanId(id: string) {
  if (id.length < 8 || id.length > 64) throw new ConvexError("Invalid player.");
  return id;
}

export const cleanAvatar = (a: string) => a.trim().slice(0, 8) || "🔥";

export async function roomByCode(db: DatabaseReader, code: string) {
  return db
    .query("rooms")
    .withIndex("by_code", (q) => q.eq("code", code.trim().toUpperCase()))
    .order("desc")
    .first();
}

export async function memberOf(db: DatabaseReader, roomId: Doc<"rooms">["_id"], playerId: string) {
  return db
    .query("roomPlayers")
    .withIndex("by_room_player", (q) => q.eq("roomId", roomId).eq("playerId", playerId))
    .first();
}

// The room and your seat in it, or a readable error
export async function requireMember(db: DatabaseReader, code: string, playerId: string) {
  const room = await roomByCode(db, code);
  if (!room || room.status !== "open") throw new ConvexError("That room is closed.");
  const me = await memberOf(db, room._id, playerId);
  if (!me) throw new ConvexError("Join the room first.");
  if (me.kicked) throw new ConvexError("The host removed you from this room.");
  return { room, me };
}

export async function requireHost(db: DatabaseReader, code: string, playerId: string) {
  const { room, me } = await requireMember(db, code, playerId);
  if (room.hostId !== playerId) throw new ConvexError("Only the host can do that.");
  return { room, me };
}

export async function addPoints(db: DatabaseWriter, row: Doc<"roomPlayers">, game: string, points: number) {
  if (points <= 0) return;
  const scores = { ...row.scores, [game]: (row.scores[game] ?? 0) + points };
  await db.patch(row._id, { scores, total: row.total + points });
}

export const isOnline = (row: Doc<"roomPlayers">) => row.lastSeen > Date.now() - ONLINE_MS;
