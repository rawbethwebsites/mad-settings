import { ConvexError } from "convex/values";
import type { DatabaseReader, DatabaseWriter } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { staffRole } from "./walletLib";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ONLINE_MS = 40 * 1000;

// The camp room: every registered camper is in it, and camp admins host it
export const CAMP_CODE = "CAMP";
export const CAMP_HOST = "mad-settings-camp-room";
export const CAMP_NAME = "MAD SETTINGS Camp";

export async function isRoomHost(db: DatabaseReader, room: Doc<"rooms">, playerId: string) {
  if (room.hostId === playerId) return true;
  return room.hostId === CAMP_HOST && (await staffRole(db, playerId)) === "head";
}

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
  if (!(await isRoomHost(db, room, playerId))) throw new ConvexError("Only the host can do that.");
  return { room, me };
}

export async function addPoints(db: DatabaseWriter, row: Doc<"roomPlayers">, game: string, points: number) {
  if (points <= 0) return;
  const scores = { ...row.scores, [game]: (row.scores[game] ?? 0) + points };
  await db.patch(row._id, { scores, total: row.total + points });
}

// Puts a registered camper in the camp room (making the room the first time). Removed campers stay out.
export async function addToCamp(db: DatabaseWriter, account: Doc<"accounts">, avatar?: string) {
  const now = Date.now();
  let room = await roomByCode(db, CAMP_CODE);
  if (!room || room.hostId !== CAMP_HOST) {
    const id = await db.insert("rooms", { code: CAMP_CODE, name: CAMP_NAME, hostId: CAMP_HOST, status: "open", createdAt: now, updatedAt: now });
    room = (await db.get(id))!;
  } else if (room.status !== "open") await db.patch(room._id, { status: "open", updatedAt: now });
  const name = cleanName(account.name);
  const host = (await staffRole(db, account.playerKey)) === "head";
  const row = await memberOf(db, room._id, account.playerKey);
  if (row?.kicked) return null;
  if (row) await db.patch(row._id, { name, isHost: host, ...(avatar ? { avatar: cleanAvatar(avatar) } : {}) });
  else await db.insert("roomPlayers", { roomId: room._id, playerId: account.playerKey, name, avatar: cleanAvatar(avatar ?? ""), isHost: host, kicked: false, lastSeen: 0, scores: {}, total: 0 });
  return CAMP_CODE;
}

export const isOnline = (row: Doc<"roomPlayers">) => row.lastSeen > Date.now() - ONLINE_MS;
