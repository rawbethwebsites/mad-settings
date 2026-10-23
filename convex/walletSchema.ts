import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const accountStatus = v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected'));
export const paymentKind = v.union(v.literal('registration'), v.literal('topup'));
export const reviewStatus = v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected'));

// Camper accounts, bank-transfer proofs, and a spend-only wallet (no withdrawals, no cash prizes).
// Amounts are whole naira.
export const walletTables = {
  accounts: defineTable({
    name: v.string(),
    phone: v.string(), // digits only, local format (080...)
    email: v.optional(v.string()),
    stay: v.optional(v.string()),
    guests: v.optional(v.number()),
    ticket: v.optional(v.string()), // ticket name, e.g. Couples tent
    ticketTotal: v.optional(v.number()), // what the camp fee should be
    passwordHash: v.string(),
    salt: v.string(),
    // The same secret id the rest of the site uses for this camper (rooms, chess, Connect)
    playerKey: v.string(),
    status: accountStatus,
    balance: v.number(),
    failedLogins: v.number(),
    lockedUntil: v.number(),
    createdAt: v.number(),
    // Casino chips: bought with the wallet, play-only, never turned back into naira or prizes
    chips: v.optional(v.number()),
    adult: v.optional(v.boolean()), // ticked "I'm 18 or older" before buying chips
    founderNo: v.optional(v.number()), // Founding Camper #1–#100, by approval order
  }).index('by_phone', ['phone']).index('by_player_key', ['playerKey']).index('by_created', ['createdAt'])
    .index('by_chips', ['chips']).index('by_founder', ['founderNo']),

  payments: defineTable({
    accountId: v.id('accounts'),
    kind: paymentKind,
    amount: v.number(),
    proof: v.id('_storage'),
    status: reviewStatus,
    note: v.optional(v.string()),
    reviewer: v.optional(v.string()),
    createdAt: v.number(),
    reviewedAt: v.optional(v.number()),
  }).index('by_status', ['status', 'createdAt']).index('by_account', ['accountId', 'createdAt']).index('by_proof', ['proof']),

  walletEntries: defineTable({
    accountId: v.id('accounts'),
    amount: v.number(), // + money in, - money spent
    kind: v.union(v.literal('topup'), v.literal('play'), v.literal('shop'), v.literal('adjust'), v.literal('refund'), v.literal('chips')),
    label: v.string(),
    by: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_account', ['accountId', 'createdAt']),

  gamePrices: defineTable({ game: v.string(), price: v.number() }).index('by_game', ['game']),

  shopItems: defineTable({ name: v.string(), emoji: v.string(), price: v.number(), active: v.boolean(), createdAt: v.number() }),

  shopOrders: defineTable({
    accountId: v.id('accounts'),
    item: v.string(),
    emoji: v.string(),
    price: v.number(),
    status: v.union(v.literal('paid'), v.literal('collected'), v.literal('refunded')),
    createdAt: v.number(),
  }).index('by_status', ['status', 'createdAt']).index('by_account', ['accountId', 'createdAt']),

  campSettings: defineTable({
    key: v.literal('bank'),
    bankName: v.string(),
    accountName: v.string(),
    accountNumber: v.string(),
    priceNote: v.string(),
  }).index('by_key', ['key']),

  chipEntries: defineTable({
    accountId: v.id('accounts'),
    amount: v.number(), // + chips in, - chips out
    kind: v.union(v.literal('buy'), v.literal('stake'), v.literal('win'), v.literal('refund'), v.literal('bonus'), v.literal('adjust')),
    label: v.string(),
    createdAt: v.number(),
  }).index('by_account', ['accountId', 'createdAt']).index('by_kind', ['kind', 'createdAt']),

  // House cut and the pause switch for chip games
  casinoSettings: defineTable({ key: v.literal('casino'), houseCut: v.number(), paused: v.boolean() }).index('by_key', ['key']),

  // Cashiers can review payments and run the wallet; the Head Ranger can do everything here too
  staff: defineTable({ playerId: v.string(), role: v.literal('cashier'), createdAt: v.number() }).index('by_player', ['playerId']),
};
