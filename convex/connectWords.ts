import { ConvexError } from 'convex/values';

// Small, explicit MVP safety list; Rangers still review reports. Not an AI moderation claim.
export const CONNECT_BANNED_WORDS = ['fuck', 'shit', 'bitch', 'asshole', 'nigger', 'faggot', 'rape', 'kill yourself'] as const;
export function cleanText(raw: string, max: number) {
  const text = raw.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  if (!text || text.length > max) throw new ConvexError(`Use between 1 and ${max} characters.`);
  const folded = text.toLowerCase().replace(/[013457@$]/g, c => ({ '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' })[c]!);
  if (CONNECT_BANNED_WORDS.some(word => new RegExp(`\\b${word.replace(/ /g, '\\s+')}\\b`, 'i').test(folded))) throw new ConvexError('Keep it kind around the campfire. Please rephrase.');
  return text;
}
export function earlyContact(text: string) {
  const s = text.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '');
  return /(?:https?:|www\.|[a-z0-9-]+\s*[.。]\s*[a-z]{2,}(?:\b|\/)|[a-z0-9._%+-]+@|@\w{2,})/i.test(s)
    || /(?:\+?\d[\s().-]*){7,}/.test(s)
    || /(?:zero|one|two|three|four|five|six|seven|eight|nine)(?:[\s,.-]+(?:zero|one|two|three|four|five|six|seven|eight|nine)){6,}/i.test(s);
}
