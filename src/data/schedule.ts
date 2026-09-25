
export interface ScheduleEvent {
  time: string;
  title: string;
  description?: string;
  detail?: string;
  id: string;
}

export const schedule: ScheduleEvent[] = [
  {
    id: 'setup',
    time: '4:00 PM – 5:30 PM',
    title: 'DJ Equipment Setup',
    detail: 'Strict deadline: 5:30 PM',
  },
  {
    id: 'arrival',
    time: '4:30 PM – 7:30 PM',
    title: 'Arrival & Settling In',
    description: 'Background Music Active',
  },
  {
    id: 'intro',
    time: '7:45 PM – 8:20 PM',
    title: 'Introductions',
    description: 'Event Introduction, Guest Introductions & Icebreakers',
  },
  {
    id: 'games',
    time: '8:30 PM – 9:20 PM',
    title: 'Featured Games & Activities',
    description: 'Your phone is your controller',
  },
  {
    id: 'movie',
    time: '9:30 PM – 10:20 PM',
    title: 'Movie Screening',
  },
  {
    id: 'karaoke',
    time: '10:30 PM – 12:00 AM',
    title: 'Karaoke',
  },
  {
    id: 'bonfire',
    time: '12:00 AM – 2:30 AM',
    title: 'Bonfire Party',
    description: 'Music. Fire. Stories. Games. Vibes.',
  },
  {
    id: 'chill',
    time: '2:30 AM – 7:30 AM',
    title: 'Low-Tempo Music',
    description: 'Conversations go up',
  },
  {
    id: 'morning',
    time: '7:30 AM – 8:30 AM',
    title: 'Interactive Games & Socializing',
  },
  {
    id: 'football',
    time: '9:00 AM – 11:30 AM',
    title: '5-a-Side Soccer',
    description: 'Medium-Tempo Music & Vibes',
  },
  {
    id: 'departure',
    time: '12:00 PM',
    title: 'Departure',
    description: "That's a wrap",
  },
];
