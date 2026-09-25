export type Avatar = "fox" | "frog" | "bear" | "owl";
export type View = "map" | "tent" | "campfire" | "trail" | "scores" | "host";
export type GameKey = "quiz" | "trail" | "fingers" | "missions";

export type Camper = {
  id: string;
  name: string;
  avatar: Avatar;
  tentId: string;
  active: boolean;
  isCurrent?: boolean;
};

export type Tent = {
  id: string;
  name: string;
  color: string;
};

export type ScoreEntry = {
  id: string;
  playerId: string;
  tentId: string;
  points: number;
  reason: string;
  createdAt: number;
};

export type MissionSubmission = {
  id: string;
  playerId: string;
  tentId: string;
  missionId: string;
  evidence: string;
  status: "pending" | "approved" | "rejected";
  points: number;
  submittedAt: number;
};

export type CampState = {
  version: 1;
  currentPlayerId: string | null;
  campers: Camper[];
  tents: Tent[];
  scores: ScoreEntry[];
  missions: MissionSubmission[];
  completedTrailSpots: string[];
  completedQuiz: boolean;
  gameOpen: Record<GameKey, boolean>;
};

export type QuizQuestion = {
  prompt: string;
  answers: string[];
  correct: number;
};

export type TrailSpot = {
  id: string;
  name: string;
  clue: string;
  code: string;
  points: number;
};

export type Mission = {
  id: string;
  title: string;
  brief: string;
  points: number;
};
