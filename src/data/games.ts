
export interface Game {
  id: string;
  name: string;
  tagline: string;
  description: string;
  number: string;
  path: string;
}

// The four camp games featured on the homepage
export const games: Game[] = [
  {
    id: 'smart-bingo',
    path: '/games/bingo',
    number: '01',
    name: 'SMART BINGO',
    tagline: 'Classic Bingo. Upgraded.',
    description: 'A fast digital version of Bingo with surprises, bonuses and competitive twists.',
  },
  {
    id: 'ultimate-search',
    path: '/games/search',
    number: '02',
    name: 'ULTIMATE SEARCH',
    tagline: 'Find it. Scan it. Unlock it.',
    description: 'Solve clues, search the camp, discover hidden codes and race other players.',
  },
  {
    id: 'puzzle-rush',
    path: '/games/puzzles',
    number: '03',
    name: 'PUZZLE RUSH',
    tagline: 'Think fast. Solve faster.',
    description: 'Rapid puzzles, visual riddles, patterns and challenges.',
  },
  {
    id: 'the-vault',
    path: '/games/vault',
    number: '04',
    name: 'THE VAULT',
    tagline: 'Collect the clues. Crack the code.',
    description: 'Challenges throughout the night reveal pieces of a final secret code.',
  },
];

// Every game campers can play, in the order the games page shows them
export const GAMES = [
  // Camp games
  { id: 'bingo', group: 'camp', name: 'SMART BINGO', emoji: '🎯', tagline: 'Classic. Upgraded.', path: '/games/bingo', color: 'bg-brand-purple text-brand-cream' },
  { id: 'search', group: 'camp', name: 'ULTIMATE SEARCH', emoji: '🔍', tagline: 'Find it. Scan it.', path: '/games/search', color: 'bg-brand-acid text-brand-black' },
  { id: 'puzzles', group: 'camp', name: 'PUZZLE RUSH', emoji: '🧩', tagline: 'Think fast.', path: '/games/puzzles', color: 'bg-brand-coral text-brand-black' },
  { id: 'vault', group: 'camp', name: 'THE VAULT', emoji: '🔐', tagline: 'Crack the code.', path: '/games/vault', color: 'bg-brand-black text-brand-cream' },
  { id: 'same', group: 'camp', name: "DON'T SAY IT", emoji: '🤐', tagline: "2v2. Don't say the same thing.", path: '/games/same', color: 'bg-brand-cyan text-brand-black' },
  { id: 'chess', group: 'camp', name: 'CAMP CHESS', emoji: '♟️', tagline: 'Campfire vs. the night. Play a camper online.', path: '/games/chess', color: 'bg-brand-coral text-brand-black' },
  // Arcade
  { id: 'ludo', group: 'arcade', name: 'LUDO', emoji: '🎲', tagline: 'Shake to roll. Race your seeds home.', path: '/games/ludo', color: 'bg-brand-coral text-brand-black' },
  { id: 'ayo', group: 'arcade', name: 'AYO', emoji: '🌰', tagline: 'Sow seeds. Capture pits.', path: '/games/ayo', color: 'bg-brand-acid text-brand-black' },
  { id: 'whot', group: 'arcade', name: 'WHOT!', emoji: '🃏', tagline: 'Nigeria\'s favourite card game.', path: '/games/whot', color: 'bg-brand-purple text-brand-cream' },
  { id: 'ocho', group: 'arcade', name: 'OCHO!', emoji: '🎴', tagline: 'Match it. Call OCHO!', path: '/games/ocho', color: 'bg-brand-coral text-brand-black' },
  { id: 'tenten', group: 'arcade', name: 'TEN TEN', emoji: '👆', tagline: 'Point. Catch. Escape.', path: '/games/tenten', color: 'bg-brand-cyan text-brand-black' },
  { id: 'trivia', group: 'arcade', name: 'NAIJA TRIVIA', emoji: '🇳🇬', tagline: 'How well do you know Naija?', path: '/games/trivia', color: 'bg-brand-black text-brand-cream' },
  { id: 'chopchop', group: 'arcade', name: 'CHOP CHOP', emoji: '🍢', tagline: 'Swipe and match Naija snacks. Beat the levels.', path: '/games/chopchop', color: 'bg-brand-acid text-brand-black' },
  { id: 'minesweeper', group: 'arcade', name: 'MINESWEEPER', emoji: '💣', tagline: 'Clear the field.', path: '/games/minesweeper', color: 'bg-brand-cyan text-brand-black' },
  { id: 'connect4', group: 'arcade', name: 'CONNECT 4', emoji: '🔴', tagline: 'Four in a row.', path: '/games/connect4', color: 'bg-brand-coral text-brand-black' },
  { id: 'tictactoe', group: 'arcade', name: 'ENDLESS TIC TAC TOE', emoji: '⭕', tagline: 'Only 3 pieces. Oldest vanishes.', path: '/games/tictactoe', color: 'bg-brand-purple text-brand-cream' },
  { id: 'dots', group: 'arcade', name: 'DOTS & BOXES', emoji: '🔲', tagline: 'Draw lines. Steal boxes.', path: '/games/dots', color: 'bg-brand-acid text-brand-black' },
];

export const GROUPS = [
  { id: 'camp', title: 'CAMP GAMES' },
  { id: 'arcade', title: 'NAIJA ARCADE' },
];
