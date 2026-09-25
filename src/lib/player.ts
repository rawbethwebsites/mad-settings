// Player profile + scorecard system
// All data stored in localStorage — no backend needed

export interface Player {
  name: string;
  avatar: string;
  roomCode: string;
  joinedAt: number;
  scores: {
    bingo: number;
    search: number;
    puzzles: number;
    vault: number;
  };
  vaultPieces: string[]; // code pieces collected from other games
  badges: string[]; // achievement badges
}

const STORAGE_KEY = 'mad-settings-player';
const ROOM_KEY = 'mad-settings-room';

export const AVATARS = [
  '🔥', '⛺', '🎸', '🎤', '⚽', '🌟', '🎯', '🧩',
  '🎮', '🎲', '🎪', '🦊', '🦉', '🐺', '🌙', ' sun',
];

export function createPlayer(name: string, avatar: string, roomCode: string): Player {
  const player: Player = {
    name,
    avatar,
    roomCode: roomCode.toUpperCase(),
    joinedAt: Date.now(),
    scores: { bingo: 0, search: 0, puzzles: 0, vault: 0 },
    vaultPieces: [],
    badges: [],
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
  return player;
}

export function getPlayer(): Player | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as Player;
  } catch {
    return null;
  }
}

export function updatePlayer(updates: Partial<Player>): Player | null {
  const player = getPlayer();
  if (!player) return null;
  const updated = { ...player, ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function addScore(game: keyof Player['scores'], points: number): Player | null {
  const player = getPlayer();
  if (!player) return null;
  player.scores[game] += points;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
  return player;
}

export function addVaultPiece(piece: string): Player | null {
  const player = getPlayer();
  if (!player) return null;
  if (!player.vaultPieces.includes(piece)) {
    player.vaultPieces.push(piece);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
  }
  return player;
}

export function addBadge(badge: string): Player | null {
  const player = getPlayer();
  if (!player) return null;
  if (!player.badges.includes(badge)) {
    player.badges.push(badge);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
  }
  return player;
}

export function getTotalScore(player: Player): number {
  return Object.values(player.scores).reduce((a, b) => a + b, 0);
}

export function clearPlayer() {
  localStorage.removeItem(STORAGE_KEY);
}

// Room code generation
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function createRoom(): string {
  const code = generateRoomCode();
  localStorage.setItem(ROOM_KEY, code);
  return code;
}

export function getRoomCode(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ROOM_KEY);
}