// Camper avatars: the choices a camper can make, shared by the site and the server.
// Looks are stored as small indexes so the server can check them.

export type Gender = 'male' | 'female';
export type AvatarHair = 'short' | 'afro' | 'cap' | 'bun' | 'bald' | 'braids';

export const AVATAR_SKIN = ['#3f2618', '#4a2c1c', '#5c3722', '#6e4129', '#7d4c30', '#8f5a3a', '#a46b45'];
export const AVATAR_SHIRTS = ['#6D28D9', '#BEF264', '#FB7185', '#22D3EE', '#FDFBF7', '#F59E0B', '#0A0A0A', '#1f7a5a'];
export const AVATAR_PANTS = ['#1d1d2a', '#2a3a5a', '#3a3226', '#4a4a52', '#d8cdb8'];
export const AVATAR_HAIR: Record<Gender, AvatarHair[]> = {
  female: ['braids', 'bun', 'afro', 'short'],
  male: ['short', 'afro', 'cap', 'bald'],
};
export const HAIR_NAMES: Record<AvatarHair, string> = {
  short: 'Short', afro: 'Afro', cap: 'Cap', bun: 'Bun', bald: 'Bald', braids: 'Braids',
};
export const SHOUT_MAX = 80;

export type AvatarLook = { skin: number; hair: AvatarHair; shirt: number; pants: number };

// A starting look picked from the camper's name, so sign-up never asks for more
export function startingLook(gender: Gender, seed: string): AvatarLook {
  let h = 7;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const pick = (n: number, salt: number) => ((h >>> salt) + salt) % n;
  const hairs = AVATAR_HAIR[gender];
  return { skin: pick(AVATAR_SKIN.length, 1), hair: hairs[pick(hairs.length, 3)], shirt: pick(AVATAR_SHIRTS.length, 5), pants: pick(AVATAR_PANTS.length, 7) };
}

export function validLook(gender: Gender, l: AvatarLook) {
  const ok = (i: number, n: number) => Number.isInteger(i) && i >= 0 && i < n;
  return ok(l.skin, AVATAR_SKIN.length) && ok(l.shirt, AVATAR_SHIRTS.length) && ok(l.pants, AVATAR_PANTS.length) && AVATAR_HAIR[gender].includes(l.hair);
}
