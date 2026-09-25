
export interface Game {
  id: string;
  name: string;
  tagline: string;
  description: string;
  number: string;
}

export const games: Game[] = [
  {
    id: 'smart-bingo',
    number: '01',
    name: 'SMART BINGO',
    tagline: 'Classic Bingo. Upgraded.',
    description: 'A fast digital version of Bingo with surprises, bonuses and competitive twists.',
  },
  {
    id: 'ultimate-search',
    number: '02',
    name: 'ULTIMATE SEARCH',
    tagline: 'Find it. Scan it. Unlock it.',
    description: 'Solve clues, search the camp, discover hidden codes and race other players.',
  },
  {
    id: 'puzzle-rush',
    number: '03',
    name: 'PUZZLE RUSH',
    tagline: 'Think fast. Solve faster.',
    description: 'Rapid puzzles, visual riddles, patterns and challenges.',
  },
  {
    id: 'the-vault',
    number: '04',
    name: 'THE VAULT',
    tagline: 'Collect the clues. Crack the code.',
    description: 'Challenges throughout the night reveal pieces of a final secret code.',
  },
];
