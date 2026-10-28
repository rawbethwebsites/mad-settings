// Camp accounts on this phone. Logging in swaps this phone over to the account's camper id,
// so rooms, chess, Connect and the wallet all follow the camper to any phone.
import { createPlayer, getPlayer, updatePlayer } from './player';

const ID_KEY = 'mad-settings-chess-id';
const PLAYER_KEY = 'mad-settings-player';

export function signInOnThisPhone(playerKey: string, name: string) {
  try {
    localStorage.setItem(ID_KEY, playerKey);
    if (!getPlayer()) createPlayer(name, '🔥', '');
  } catch { /* private browsing: the login still works until the tab closes */ }
}

export function logOutOfThisPhone() {
  try {
    localStorage.removeItem(ID_KEY);
    localStorage.removeItem(PLAYER_KEY);
  } catch { /* nothing stored */ }
}

// Every registered camper is in the camp room; point this phone at it unless they're in another room
export const CAMP_ROOM = 'CAMP';
export function enterCampRoom(name: string, force = false) {
  try {
    const p = getPlayer();
    if (!p) createPlayer(name, '🔥', CAMP_ROOM);
    else if (force || !p.roomCode) updatePlayer({ roomCode: CAMP_ROOM });
  } catch { /* private browsing */ }
}

export const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`;

// Sends a receipt photo to storage and returns its id
export async function uploadReceipt(uploadUrl: string, file: File) {
  if (file.size > 8 * 1024 * 1024) throw new Error('That photo is too big. Use one under 8 MB.');
  const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.type || 'image/jpeg' }, body: file });
  if (!res.ok) throw new Error('Upload failed. Check your connection and try again.');
  return (await res.json()).storageId as string;
}

export function serverMessage(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  const data = (e as { data?: unknown })?.data;
  if (typeof data === 'string') return data;
  const m = msg.match(/(?:Uncaught (?:Convex)?Error: )(.+?)(?:\n|$)/);
  return m ? m[1] : msg.split('\n')[0] || 'Something went wrong. Try again.';
}
