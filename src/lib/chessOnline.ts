// Identity + bookkeeping for live Camp Chess games.
// The id is a secret kept only in this browser; the server never shows it to other players.

const ID_KEY = 'mad-settings-chess-id';
const AWARDED_KEY = 'mad-settings-chess-awarded';

function randomId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export function getChessPlayerId(): string {
  try {
    const existing = localStorage.getItem(ID_KEY);
    if (existing && existing.length >= 8) return existing;
    const fresh = randomId();
    localStorage.setItem(ID_KEY, fresh);
    return fresh;
  } catch {
    return randomId();
  }
}

// Points are given once per finished game, even if the page reloads
export function claimAward(gameKey: string): boolean {
  try {
    const seen: string[] = JSON.parse(localStorage.getItem(AWARDED_KEY) ?? '[]');
    if (seen.includes(gameKey)) return false;
    localStorage.setItem(AWARDED_KEY, JSON.stringify([...seen, gameKey].slice(-50)));
    return true;
  } catch {
    return true;
  }
}
