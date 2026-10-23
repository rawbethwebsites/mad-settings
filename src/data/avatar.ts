// Camper avatars: the choices a camper can make, shared by the site and the server.
// Looks are stored as small indexes so the server can check them.

export type Gender = 'male' | 'female';
export type AvatarHair = 'short' | 'afro' | 'cap' | 'bun' | 'bald' | 'braids' | 'long';

export const AVATAR_SKIN = ['#3f2618', '#4a2c1c', '#5c3722', '#6e4129', '#7d4c30', '#8f5a3a', '#a46b45'];
export const AVATAR_SHIRTS = ['#6D28D9', '#BEF264', '#FB7185', '#22D3EE', '#FDFBF7', '#F59E0B', '#0A0A0A', '#1f7a5a'];
export const AVATAR_PANTS = ['#1d1d2a', '#2a3a5a', '#3a3226', '#4a4a52', '#d8cdb8'];
export const AVATAR_HAIR: Record<Gender, AvatarHair[]> = {
  female: ['long', 'braids', 'bun', 'afro'],
  male: ['short', 'afro', 'cap', 'bald'],
};
export const HAIR_NAMES: Record<AvatarHair, string> = {
  short: 'Spiky', afro: 'Afro', cap: 'Cap', bun: 'Bun', bald: 'Bald', braids: 'Twin tails', long: 'Long',
};
// Anime hair colours: natural first, then the fun ones
export const AVATAR_HAIR_COLORS = ['#1a1420', '#5a3825', '#e8c46a', '#f29cc2', '#8b5cf6', '#4c7bd9', '#c8402f', '#eceaf2'];
export const SHOUT_MAX = 80;

export type AvatarShape = 'curvy' | 'slim' | 'broad' | 'athletic';
export type AvatarTop = 'tee' | 'crop' | 'bikini' | 'tank' | 'shirtless';
export type AvatarBottom = 'shorts' | 'trousers';
export const AVATAR_SHAPES: Record<Gender, AvatarShape[]> = { female: ['curvy', 'slim'], male: ['broad', 'athletic'] };
export const AVATAR_TOPS: Record<Gender, AvatarTop[]> = { female: ['crop', 'bikini', 'tee'], male: ['tank', 'shirtless', 'tee'] };
export const AVATAR_BOTTOMS: AvatarBottom[] = ['shorts', 'trousers'];
export const STYLE_NAMES: Record<AvatarShape | AvatarTop | AvatarBottom, string> = {
  curvy: 'Curvy', slim: 'Slim', broad: 'Broad chest', athletic: 'Athletic',
  tee: 'T-shirt', crop: 'Crop top', bikini: 'Bikini top', tank: 'Tank top', shirtless: 'Shirtless',
  shorts: 'Shorts', trousers: 'Trousers',
};

export type AvatarLook = {
  skin: number; hair: AvatarHair; shirt: number; pants: number; hairColor?: number;
  shape?: AvatarShape; top?: AvatarTop; bottom?: AvatarBottom;
};

// A starting look picked from the camper's name, so sign-up never asks for more
export function startingLook(gender: Gender, seed: string): AvatarLook {
  let h = 7;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const pick = (n: number, salt: number) => ((h >>> salt) + salt) % n;
  const hairs = AVATAR_HAIR[gender];
  return { skin: pick(AVATAR_SKIN.length, 1), hair: hairs[pick(hairs.length, 3)], shirt: pick(AVATAR_SHIRTS.length, 5), pants: pick(AVATAR_PANTS.length, 7), hairColor: pick(2, 9),
    shape: AVATAR_SHAPES[gender][pick(2, 11)], top: AVATAR_TOPS[gender][pick(3, 13)], bottom: AVATAR_BOTTOMS[pick(2, 15)] };
}

export function validLook(gender: Gender, l: AvatarLook) {
  const ok = (i: number, n: number) => Number.isInteger(i) && i >= 0 && i < n;
  return ok(l.skin, AVATAR_SKIN.length) && ok(l.shirt, AVATAR_SHIRTS.length) && ok(l.pants, AVATAR_PANTS.length) && AVATAR_HAIR[gender].includes(l.hair)
    && (l.hairColor === undefined || ok(l.hairColor, AVATAR_HAIR_COLORS.length))
    && (l.shape === undefined || AVATAR_SHAPES[gender].includes(l.shape))
    && (l.top === undefined || AVATAR_TOPS[gender].includes(l.top))
    && (l.bottom === undefined || AVATAR_BOTTOMS.includes(l.bottom));
}
