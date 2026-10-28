// Camp tickets (Rob, 28 Oct 2026: registering is free). The ticket only says how you stay.
export const CAMP_DATE = 'Sat 31 Oct';
export const CAMP_START = '12 noon';

export const TICKETS = [
  { id: 'attendee', name: 'Attendee', people: 1, note: 'Your spot at camp, per person', stay: 'undecided' },
  { id: 'single', name: 'Single tent', people: 1, note: 'Your own tent for the night', stay: 'sleepover' },
  { id: 'couples', name: 'Couples tent', people: 2, note: 'One tent for two', stay: 'sleepover' },
] as const;

// Tents on site; sign-ups stop offering tents once these are taken
export const TENTS_TOTAL = 70;

export type TicketId = (typeof TICKETS)[number]['id'];
