// Camp tickets and prices (Rob, 23 Oct 2026). Prices are per ticket.
export const CAMP_DATE = 'Sat 31 Oct';
export const CAMP_START = '12 noon';

export const TICKETS = [
  { id: 'attendee', name: 'Attendee', price: 10000, people: 1, note: 'Your spot at camp, per person', stay: 'undecided' },
  { id: 'single', name: 'Single tent', price: 30000, people: 1, note: 'Your own tent for the night', stay: 'sleepover' },
  { id: 'couples', name: 'Couples tent', price: 35000, people: 2, note: 'One tent for two', stay: 'sleepover' },
] as const;

export type TicketId = (typeof TICKETS)[number]['id'];

export const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`;
export const FROM_PRICE = naira(Math.min(...TICKETS.map((t) => t.price)));
