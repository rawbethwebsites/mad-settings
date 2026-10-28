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
export const FOUNDERS = 10;
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

// The first campers approved become Founding Campers, with bonus chips
export async function makeFounder(db: DatabaseWriter, account: Doc<'accounts'>) {
  if (account.founderNo) return;
  const last = await db.query('accounts').withIndex('by_founder', q => q.gt('founderNo', 0)).order('desc').first();
  const next = (last?.founderNo ?? 0) + 1;
  if (next > FOUNDERS) return;
  await db.patch(account._id, { founderNo: next });
  await moveChips(db, (await db.get(account._id))!, FOUNDER_CHIPS, 'bonus', `Founding Camper #${next} bonus`);
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
export async function returnStakes(db: DatabaseWriter, staked: string[], stake: number, game: string) {
  for (const playerId of staked) await giveChips(db, playerId, stake, 'refund', `${game} called off`);
}

// Game over: the house keeps its cut, the winners share the rest (a draw shares it among everyone).
// seatIds are the players in seat order; returns what each seat got.
export async function settlePot(
  db: DatabaseWriter,
  pot: { stake: number; staked: string[]; houseCut?: number; game: string },
  seatIds: string[],
  winnerIds: string[],
) {
  const total = pot.stake * pot.staked.length;
  const cut = Math.floor((total * (pot.houseCut ?? DEFAULT_CUT)) / 100);
  const takers = (winnerIds.length ? winnerIds : seatIds).filter(id => pot.staked.includes(id));
  const share = takers.length ? Math.floor((total - cut) / takers.length) : 0;
  for (const id of takers) {
    await giveChips(db, id, share, winnerIds.length ? 'win' : 'refund', `${winnerIds.length ? 'Won' : 'Draw in'} ${pot.game}`);
  }
  return { house: total - share * takers.length, seats: seatIds.map(id => (takers.includes(id) ? share : 0)) };
}

export async function refundStakes(db: DatabaseWriter, match: Doc<'matches'>) {
  if (!match.stake || !match.staked?.length) return;
  await returnStakes(db, match.staked, match.stake, match.game);
  await db.patch(match._id, { staked: [] });
}

export async function payPot(db: DatabaseWriter, match: Doc<'matches'>, winners: number[]) {
  if (!match.stake || !match.staked?.length || match.payout) return;
  const seatIds = match.seats.map(s => s.playerId);
  const payout = await settlePot(db, { stake: match.stake, staked: match.staked, houseCut: match.houseCut, game: match.game }, seatIds, winners.map(i => seatIds[i]));
  await db.patch(match._id, { payout });
}
