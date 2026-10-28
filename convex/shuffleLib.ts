import type { DatabaseWriter } from './_generated/server';
import type { Doc } from './_generated/dataModel';

// A shuffle game ended: losers go straight back in the queue, winners choose whether to keep going
export async function shuffleEnded(db: DatabaseWriter, match: Doc<'matches'>, winners: number[]) {
  if (!match.shuffle) return;
  const now = Date.now();
  for (let i = 0; i < match.seats.length; i++) {
    const row = await db.query('shuffleQueue').withIndex('by_player', q => q.eq('playerId', match.seats[i].playerId)).first();
    if (!row || row.matchId !== match._id || row.status !== 'matched') continue;
    await db.patch(row._id, winners.includes(i) ? { status: 'won', wins: row.wins + 1 } : { status: 'waiting', joinedAt: now });
  }
}
