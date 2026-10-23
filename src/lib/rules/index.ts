import type { Rules } from './types';
import { tictactoe } from './tictactoe';
import { connect4 } from './connect4';
import { dots } from './dots';
import { ayo } from './ayo';
import { ludo } from './ludo';
import { whot } from './whot';
import { ocho } from './ocho';
import { race } from './race';
import { tenten } from './tenten';
import { same } from './same';

// Every game campers can play against each other online, by game id
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const RULES: Record<string, Rules<any, any, any>> = {
  tictactoe,
  connect4,
  dots,
  ayo,
  ludo,
  whot,
  ocho,
  tenten,
  same,
  trivia: race,
  minesweeper: race,
  chopchop: race,
  puzzles: race,
  search: race,
  vault: race,
  bingo: race,
};

export const ONLINE_GAMES = Object.keys(RULES);
