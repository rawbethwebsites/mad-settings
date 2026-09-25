// Game data — all content for the 4 games

// SMART BINGO — camp-themed words
export const BINGO_WORDS = [
  'BONFIRE', 'TENT', 'GUITAR', 'S\'MORES', 'STARS',
  'FOOTBALL', 'KARAOKE', 'DJ', 'FLASHLIGHT', 'BLANKET',
  'MIDNIGHT', 'SUNRISE', 'MOSQUITO', 'GHOST STORY', 'HOT DOG',
  'DANCING', 'LAUGHTER', 'FRIENDS', 'MUSIC', 'CAMPFIRE',
  'SLEEPING BAG', 'PILLOW', 'SNACKS', 'MEMORY', 'ADVENTURE',
  'SINGING', 'STARING', 'WHISPER', 'COLD NIGHT', 'WARM TEA',
];

// BINGO free space
export const BINGO_FREE_SPACE = true; // center is free

// ULTIMATE SEARCH — scavenger hunt clues
export interface SearchClue {
  id: string;
  clue: string;
  answer: string; // the code word players find at the location
  points: number;
}

export const SEARCH_CLUES: SearchClue[] = [
  { id: '1', clue: 'Where the fire burns bright, find the word that lights the night.', answer: 'FLAME', points: 10 },
  { id: '2', clue: 'Under the first tent you see, a word is taped to the pole.', answer: 'CANVAS', points: 10 },
  { id: '3', clue: 'The DJ booth has a sticker. What does it say?', answer: 'BEATS', points: 10 },
  { id: '4', clue: 'Near the food table, check under the plate stack.', answer: 'FEAST', points: 15 },
  { id: '5', clue: 'The football pitch corner flag has a tag. Read it.', answer: 'GOAL', points: 10 },
  { id: '6', clue: 'Behind the movie screen, a word is written in chalk.', answer: 'CINEMA', points: 15 },
  { id: '7', clue: 'The karaoke mic stand has something wrapped around it.', answer: 'MELODY', points: 15 },
  { id: '8', clue: 'Where you sleep tonight, check under the pillow.', answer: 'DREAM', points: 20 },
]

// PUZZLE RUSH — word scrambles + pattern matching
export interface WordScramble {
  id: string;
  scrambled: string;
  answer: string;
  hint: string;
}

export const WORD_SCRAMBLES: WordScramble[] = [
  { id: '1', scrambled: 'R E F I N B O', answer: 'BONFIRE', hint: 'It burns at midnight' },
  { id: '2', scrambled: 'R O A K E E', answer: 'KARAOKE', hint: 'Mic up!' },
  { id: '3', scrambled: 'P M C A R E', answer: 'CAMPFIRE', hint: 'Outdoor fire' },
  { id: '4', scrambled: 'S R A T S', answer: 'STARS', hint: 'They light the night sky' },
  { id: '5', scrambled: 'S L A F H T H I G L', answer: 'FLASHLIGHT', hint: 'You need this after dark' },
  { id: '6', scrambled: 'G N I N S I', answer: 'SINGING', hint: 'What you do at karaoke' },
]

// Pattern matching — "which one doesn't belong?"
export interface PatternQuestion {
  id: string;
  options: string[];
  oddOneOut: number; // index
  reason: string;
}

export const PATTERN_QUESTIONS: PatternQuestion[] = [
  {
    id: '1',
    options: ['⛺', '🏕️', '🏠', '🌅'],
    oddOneOut: 2,
    reason: 'A house is not camping!',
  },
  {
    id: '2',
    options: ['🔥', '🎸', '🎤', '📚'],
    oddOneOut: 3,
    reason: 'Books are not a night activity',
  },
  {
    id: '3',
    options: ['🌙', '⭐', '☀️', '🌌'],
    oddOneOut: 2,
    reason: 'The sun is daytime!',
  },
  {
    id: '4',
    options: ['⚽', '🏀', '🎸', '🎯'],
    oddOneOut: 2,
    reason: 'A guitar is for music, not sports',
  },
]

// THE VAULT — final code pieces
// Each piece is earned by playing the other games
export const VAULT_PIECES = [
  { id: 'bingo', piece: '7', game: 'Smart Bingo', hint: 'Complete a Bingo line' },
  { id: 'search', piece: '3', game: 'Ultimate Search', hint: 'Find 3 clues' },
  { id: 'puzzles', piece: '9', game: 'Puzzle Rush', hint: 'Score 30+ points' },
  { id: 'host', piece: '1', game: 'Host Bonus', hint: 'Ask the host for this piece' },
]

// The final vault code (pieces assembled in order)
export const VAULT_CODE = '7391'

// Points for cracking the vault
export const VAULT_CRACK_POINTS = 50