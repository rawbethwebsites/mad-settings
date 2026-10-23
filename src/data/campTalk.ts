export type TalkTag = "mad" | "tbn" | "tip";

export type TalkLine = {
  tag: TalkTag;
  text: string;
  by?: string; // a real camper's first name
  cta?: { label: string; href: string };
};

export const TALK_TAGS: Record<TalkTag, string> = {
  mad: "MAD SETTINGS",
  tbn: "THE BOOST NATION",
  tip: "CAMP TIP",
};

export const TALK_LINES: Record<TalkTag, TalkLine[]> = {
  mad: [
    { tag: "mad", text: "Games kick off at 8:30. Your phone is the controller.", cta: { label: "Join the games", href: "/join" } },
    { tag: "mad", text: "Strangers at noon. Crew by midnight." },
    { tag: "mad", text: "Karaoke at 10:30. Pick your song now." },
    { tag: "mad", text: "Bonfire lights at midnight. Bring your best story." },
    { tag: "mad", text: "Scan. Join. Play. The Vault code drops all night.", cta: { label: "Enter game room", href: "/join" } },
    { tag: "mad", text: "Five-a-side at 9 AM. Yes, after the sleepover." },
  ],
  tbn: [
    { tag: "tbn", text: "This whole campsite was built by The Boost Nation.", cta: { label: "theboostnation.space", href: "https://theboostnation.space" } },
    { tag: "tbn", text: "Got an idea? TBN takes it to a live page in 48–72 hours.", cta: { label: "Get started", href: "https://theboostnation.space/get-started" } },
    { tag: "tbn", text: "Your site, your systems and your story, working together. That's TBN." },
    { tag: "tbn", text: "Start with a Foundation Audit: 48 hours, credited toward your build.", cta: { label: "Book an audit", href: "https://theboostnation.space/get-started" } },
  ],
  tip: [
    { tag: "tip", text: "Pitch your tent on high, flat ground. Dips flood when it rains." },
    { tag: "tip", text: "Clear stones and sticks before the tent goes down. Your back will thank you." },
    { tag: "tip", text: "Angle tent pegs 45° away from the tent. They hold far better." },
    { tag: "tip", text: "Bring a sleeping mat. The ground pulls heat from your body all night." },
    { tag: "tip", text: "Headlamp over flashlight. You'll want both hands free." },
    { tag: "tip", text: "Mosquito repellent goes on before sunset, not after the first bite." },
    { tag: "tip", text: "Keep a bucket of water or sand near the fire. Always." },
    { tag: "tip", text: "Never leave a fire alone. Drown it, stir it, check it's cold." },
    { tag: "tip", text: "Keep your tent zipped. Bugs don't knock." },
    { tag: "tip", text: "Layer up after midnight. It gets colder than you think." },
    { tag: "tip", text: "Shake out your shoes in the morning before you put them on." },
    { tag: "tip", text: "No food in the tent. Ants will find it." },
    { tag: "tip", text: "Drink water between the fun. Hydrate before the bonfire." },
    { tag: "tip", text: "Leave no trace: whatever you bring in, you take back out." },
    { tag: "tip", text: "Charge your power bank before you come. Sockets are rare out here." },
  ],
};

/** Camp tips come up most: the night doubles as a crash course in camping. */
export const TALK_ROTATION: TalkTag[] = ["mad", "tip", "tbn", "tip", "mad", "tip"];
