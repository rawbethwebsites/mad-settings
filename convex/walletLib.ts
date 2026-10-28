// Shared helpers for camper accounts and the wallet. Amounts are whole naira.
import { ConvexError } from 'convex/values';
import type { DatabaseReader, DatabaseWriter } from './_generated/server';
import type { Doc } from './_generated/dataModel';

export const DEFAULT_BANK = {
  bankName: 'First Bank',
  accountName: 'AFRICAN DREAM COMMUNITY',
  accountNumber: '2036386640',
  priceNote: 'Pay your camp fee by bank transfer, then upload a screenshot of the receipt.',
};
export const MAX_AMOUNT = 5_000_000;

// Nigerian mobile numbers in one shape: 11 digits starting 07, 08 or 09.
export function cleanPhone(raw: string) {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('234')) d = '0' + d.slice(3);
  if (d.length === 10 && /^[789]/.test(d)) d = '0' + d;
  if (!/^0[789]\d{9}$/.test(d)) throw new ConvexError('Enter your phone number, like 0803 123 4567.');
  return d;
}

export function cleanAmount(n: number) {
  if (!Number.isInteger(n) || n < 1 || n > MAX_AMOUNT) throw new ConvexError('Enter the amount in naira, with no kobo.');
  return n;
}

export async function accountByKey(db: DatabaseReader, playerKey: string) {
  if (!playerKey || playerKey.length < 8) return null;
  return db.query('accounts').withIndex('by_player_key', q => q.eq('playerKey', playerKey)).unique();
}

export async function requireAccount(db: DatabaseReader, playerKey: string, approved = true) {
  const a = await accountByKey(db, playerKey);
  if (!a) throw new ConvexError('Log in to your camp account first.');
  if (approved && a.status !== 'approved') throw new ConvexError('Your payment is still being checked. You can use your wallet once it is approved.');
  return a;
}

export async function staffRole(db: DatabaseReader, playerId: string): Promise<'head' | 'cashier' | null> {
  if (!playerId || playerId.length < 8) return null;
  const ranger = await db.query('rangers').withIndex('by_player', q => q.eq('playerId', playerId)).unique();
  if (ranger?.role === 'headRanger') return 'head';
  const staff = await db.query('staff').withIndex('by_player', q => q.eq('playerId', playerId)).unique();
  return staff ? 'cashier' : null;
}

export async function requireStaff(db: DatabaseReader, playerId: string, head = false) {
  const role = await staffRole(db, playerId);
  if (!role || (head && role !== 'head')) throw new ConvexError(head ? 'Only an admin can do that.' : 'Only camp staff can open the admin panel.');
  return role;
}

type Kind = Doc<'walletEntries'>['kind'];

export async function credit(db: DatabaseWriter, account: Doc<'accounts'>, amount: number, kind: Kind, label: string, by?: string) {
  const balance = account.balance + amount;
  if (balance < 0) throw new ConvexError('That would take the wallet below ₦0.');
  await db.patch(account._id, { balance });
  await db.insert('walletEntries', { accountId: account._id, amount, kind, label, by, createdAt: Date.now() });
  return balance;
}

export async function charge(db: DatabaseWriter, account: Doc<'accounts'>, amount: number, kind: Kind, label: string) {
  if (account.balance < amount) throw new ConvexError(`Not enough in your wallet (₦${account.balance.toLocaleString()}). Top up first.`);
  return credit(db, account, -amount, kind, label);
}

export async function priceOf(db: DatabaseReader, game: string) {
  return (await db.query('gamePrices').withIndex('by_game', q => q.eq('game', game)).unique())?.price ?? 0;
}

export async function bank(db: DatabaseReader) {
  const s = await db.query('campSettings').withIndex('by_key', q => q.eq('key', 'bank')).unique();
  return s ? { bankName: s.bankName, accountName: s.accountName, accountNumber: s.accountNumber, priceNote: s.priceNote } : DEFAULT_BANK;
}

// Online games: take the entry fee from a camper as they sit down
export async function chargeEntry(db: DatabaseWriter, playerId: string, game: string, label: string) {
  const price = await priceOf(db, game);
  if (price <= 0) return [];
  const account = await requireAccount(db, playerId);
  await charge(db, account, price, 'play', label);
  return [{ playerId, amount: price }];
}

// Online games that never started: give everyone their entry fee back
export async function refundEntries(db: DatabaseWriter, match: Doc<'matches'>) {
  if (!match.paid?.length) return;
  for (const { playerId, amount } of match.paid) {
    const account = await accountByKey(db, playerId);
    if (account) await credit(db, account, amount, 'refund', `${match.game} game called off`);
  }
  await db.patch(match._id, { paid: [] });
}
