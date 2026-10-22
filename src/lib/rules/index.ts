import type { Rules } from './types';
import { tictactoe } from './tictactoe';
import { connect4 } from './connect4';
import { dots } from './dots';
import { ayo } from './ayo';
import { whot } from './whot';
import { ocho } from './ocho';

// Every game campers can play against each other online, by game id
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const RULES: Record<string, Rules<any, any, any>> = { tictactoe, connect4, dots, ayo, whot, ocho };

export const ONLINE_GAMES = Object.keys(RULES);
