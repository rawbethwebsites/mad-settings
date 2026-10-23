import { v } from 'convex/values';

export const connectMode = v.union(v.literal('campfire'), v.literal('squad'));
export const connectVisibility = v.union(v.literal('everyone'), v.literal('matches'), v.literal('paused'));
export const connectPhotoStatus = v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected'));
export const rangerRole = v.union(v.literal('headRanger'), v.literal('ranger'), v.literal('gateRanger'));
export const CONNECT_PROMPTS = [
  'My campfire superpower is…', 'The song I will definitely sing at karaoke…',
  'Pull up a log if you…', 'My perfect camp snack is…',
  'My squad can count on me for…', 'The game I never turn down…',
  'A story I would tell by the fire…', 'Before sunrise, you will find me…',
] as const;
export const CONNECT_TAGS = ['Karaoke', 'Football', 'Whot shark', 'Night owl', 'Chess brain', 'Dancer', 'Foodie', 'DJ head', 'Storyteller', 'Early riser'] as const;
export const CONNECT_STICKERS = ['🔥', '🪵', '🍡', '⛺', '🌙', '🎤', '🎮', '🙌'] as const;
export const CONNECT_REACTIONS = ['🔥', '😂', '❤️', '🙌', '🍡'] as const;
export const PHOTO_TTL = 4 * 60 * 1000;
export type ConnectMode = 'campfire' | 'squad';
