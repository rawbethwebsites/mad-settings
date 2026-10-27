export interface ScheduleEvent {
  time: string;
  title: string;
  description?: string;
  detail?: string;
  id: string;
}

export const lineup = {
  host: 'MC Sapilo',
  hypeman: 'Yus',
  djs: ['Sarz', 'Virgin Sticks', 'Emzzy'],
};

export const schedule: ScheduleEvent[] = [
  {
    id: 'arrival',
    time: '12:00 PM – 4:30 PM',
    title: 'Arrival & Chilling',
    description: 'Games, Riding Bicycles, Picnic Vibes & Music',
  },
  {
    id: 'intertribe',
    time: '4:30 PM – 7:30 PM',
    title: 'Intertribe Games',
    detail: '3 hours',
  },
  {
    id: 'rest',
    time: '7:30 PM – 8:30 PM',
    title: 'Rest & Get Ready',
    description: 'Freshen up for the evening activities',
  },
  {
    id: 'social-space',
    time: '8:30 PM – 9:00 PM',
    title: 'Mad Settings Social Space',
    description: 'Introduction from The Boost Nation',
    detail: 'In front of the LED screen',
  },
  {
    id: 'intro',
    time: '9:00 PM – 9:50 PM',
    title: 'Introductions',
    description: 'Introduction, Guest Introductions & Icebreakers',
  },
  {
    id: 'karaoke',
    time: '10:00 PM – 10:50 PM',
    title: 'Karaoke',
  },
  {
    id: 'movie',
    time: '11:00 PM – 11:50 PM',
    title: 'Movie Screening',
  },
  {
    id: 'bonfire',
    time: '12:00 AM – 2:30 AM',
    title: 'Bonfire Party',
    description: 'Light up the bonfire. Main party begins.',
  },
  {
    id: 'chill',
    time: '2:30 AM – 7:30 AM',
    title: 'Low-Tempo Music',
  },
  {
    id: 'morning',
    time: '7:30 AM – 8:30 AM',
    title: 'Morning Glory',
    description: 'Cruise, Praise & Gyration, Interactive Games and Socializing',
    detail: 'Hosted by Ogogoro Settings',
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
