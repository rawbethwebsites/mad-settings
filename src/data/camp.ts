import type { Mission, QuizQuestion, TrailSpot } from "@/lib/camp/types";

export const quizQuestions: QuizQuestion[] = [
  { prompt: "Which planet has the most moons?", answers: ["Earth", "Saturn", "Mars", "Venus"], correct: 1 },
  { prompt: "What do you call a group of flamingos?", answers: ["A sparkle", "A flamboyance", "A chorus", "A blush"], correct: 1 },
  { prompt: "Which artist released ‘Ye’ in 2018?", answers: ["Burna Boy", "Wizkid", "Tems", "Davido"], correct: 0 },
  { prompt: "What is the fastest land animal?", answers: ["Lion", "Pronghorn", "Cheetah", "Ostrich"], correct: 2 },
  { prompt: "How many cards are in a standard deck?", answers: ["48", "50", "52", "54"], correct: 2 },
];

export const trailSpots: TrailSpot[] = [
  { id: "pine", name: "Whispering Pine", clue: "Find the tree wearing a purple ribbon.", code: "PINE24", points: 80 },
  { id: "fire", name: "Old Fire Ring", clue: "Look where yesterday’s embers sleep.", code: "FIRE88", points: 100 },
  { id: "moon", name: "Moon Deck", clue: "Climb to where the night gets wider.", code: "MOON31", points: 120 },
  { id: "river", name: "River Marker", clue: "Follow the sound, not the path.", code: "RIVER7", points: 150 },
];

export const tentMissions: Mission[] = [
  { id: "chant", title: "Build a tent chant", brief: "Record your loudest 10-second tent chant and describe it here.", points: 180 },
  { id: "portrait", title: "Human tent portrait", brief: "Arrange your crew into the shape of a tent. Submit a photo link or description.", points: 220 },
  { id: "kindness", title: "Secret camp kindness", brief: "Do something kind for another tent without getting caught. Tell the host what happened.", points: 260 },
];

export const avatarEmoji = { fox: "🦊", frog: "🐸", bear: "🐻", owl: "🦉" } as const;
