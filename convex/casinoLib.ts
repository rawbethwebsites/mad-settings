// Casino chips: bought with wallet naira, staked on online games, never paid out as naira or prizes.
import { ConvexError } from 'convex/values';
import type { DatabaseReader, DatabaseWriter } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { accountByKey, requireAccount } from './walletLib';

export const PACKS = [
  { naira: 1_000, chips: 1_000 },
  { naira: 2_000, chips: 2_000 },
  { naira: 5_000, chips: 5_500 },
  { naira: 10_000, chips: 11_500 },
];
export const STAKES = [100, 200, 500, 1_000, 2_000, 5_000];
export const DAILY_BUY_LIMIT = 20_000; // naira of chips per camper per day
export const FOUNDERS = 100;
export const FOUNDER_CHIPS = 2_000;
const DEFAULT_CUT = 5;

export async function casino(db: DatabaseReader) {
  const row = await db.query('casinoSettings').withIndex('by_key', q => q.eq('key', 'casino')).unique();
  return { houseCut: row?.houseCut ?? DEFAULT_CUT, paused: row?.paused ?? false };
}

type Kind = Doc<'chipEntries'>['kind'];

export async function moveChips(db: DatabaseWriter, account: Doc<'accounts'>, amount: number, kind: Kind, label: string) {
  const chips = (account.chips ?? 0) + amount;
  if (chips < 0) throw new ConvexError(`Not enough chips (${(account.chips ?? 0).toLocaleString()}). Buy more in the Casino.`);
  await db.patch(account._id, { chips });
  await db.insert('chipEntries', { accountId: account._id, amount, kind, label, createdAt: Date.now() });
  return chips;
}

// A camper sits down at a chip game: their stake goes into the pot
export async function takeStake(db: DatabaseWriter, playerId: string, stake: number, game: string) {
  const { paused } = await casino(db);
  if (paused) throw new ConvexError('Chip games are paused by camp staff right now.');
  const account = await requireAccount(db, playerId);
  if (!account.adult) throw new ConvexError('Open the Casino and confirm you are 18 or older first.');
  await moveChips(db, account, -stake, 'stake', `${game} for chips`);
}

async function giveChips(db: DatabaseWriter, playerId: string, amount: number, kind: Kind, label: string) {
  if (amount <= 0) return;
  const account = await accountByKey(db, playerId);
  if (account) await moveChips(db, account, amount, kind, label);
}

// Game called off before it started: every stake goes back in full
export async function refundStakes(db: DatabaseWriter, match: Doc<'matches'>) {
  if (!match.stake || !match.staked?.length) return;
  for (const playerId of match.staked) await giveChips(db, playerId, match.stake, 'refund', `${match.game} called off`);
  await db.patch(match._id, { staked: [] });
}

// Game over: the house keeps its cut, the winners share the rest (a draw shares it among everyone)
export async function payPot(db: DatabaseWriter, match: Doc<'matches'>, winners: number[]) {
  if (!match.stake || !match.staked?.length || match.payout) return;
  const pot = match.stake * match.staked.length;
  const cut = Math.floor((pot * (match.houseCut ?? DEFAULT_CUT)) / 100);
  const takers = (winners.length ? winners : match.seats.map((_, i) => i))
    .filter(i => match.staked!.includes(match.seats[i].playerId));
  const share = takers.length ? Math.floor((pot - cut) / takers.length) : 0;
  const seats = match.seats.map((_, i) => (takers.includes(i) ? share : 0));
  const house = pot - share * takers.length;
  for (const i of takers) {
    await giveChips(db, match.seats[i].playerId, share, winners.length ? 'win' : 'refund', `${winners.length ? 'Won' : 'Draw in'} ${match.game}`);
  }
  await db.patch(match._id, { payout: { house, seats } });
}
