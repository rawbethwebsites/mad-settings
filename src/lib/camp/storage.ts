import type { Avatar, CampState, Camper, GameKey, MissionSubmission, ScoreEntry } from "./types";

export const CAMP_STORAGE_KEY = "mad-settings:camp:v1";

export const initialCampState: CampState = {
  version: 1,
  currentPlayerId: null,
  tents: [
    { id: "violet", name: "Violet Vipers", color: "#6d28d9" },
    { id: "acid", name: "Acid Ants", color: "#bef264" },
    { id: "coral", name: "Coral Coyotes", color: "#fb7185" },
  ],
  campers: [
    { id: "seed-1", name: "Zina", avatar: "fox", tentId: "violet", active: true },
    { id: "seed-2", name: "Manny", avatar: "bear", tentId: "violet", active: true },
    { id: "seed-3", name: "Tobi", avatar: "frog", tentId: "acid", active: true },
    { id: "seed-4", name: "Amaka", avatar: "owl", tentId: "acid", active: true },
    { id: "seed-5", name: "Jules", avatar: "fox", tentId: "coral", active: true },
  ],
  scores: [
    { id: "seed-score-1", playerId: "seed-1", tentId: "violet", points: 180, reason: "Welcome challenge", createdAt: 1 },
    { id: "seed-score-2", playerId: "seed-3", tentId: "acid", points: 140, reason: "Camp setup", createdAt: 2 },
    { id: "seed-score-3", playerId: "seed-5", tentId: "coral", points: 220, reason: "Trail scout", createdAt: 3 },
  ],
  missions: [],
  completedTrailSpots: [],
  completedQuiz: false,
  gameOpen: { quiz: true, trail: true, fingers: true, missions: true },
};

export interface CampStore {
  load(): CampState;
  save(state: CampState): void;
  clear(): void;
}

export const localCampStore: CampStore = {
  load() {
    if (typeof window === "undefined") return initialCampState;
    try {
      const raw = window.localStorage.getItem(CAMP_STORAGE_KEY);
      if (!raw) return initialCampState;
      const parsed = JSON.parse(raw) as CampState;
      return parsed.version === 1 ? parsed : initialCampState;
    } catch {
      return initialCampState;
    }
  },
  save(state) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CAMP_STORAGE_KEY, JSON.stringify(state));
    }
  },
  clear() {
    if (typeof window !== "undefined") window.localStorage.removeItem(CAMP_STORAGE_KEY);
  },
};

export function assignBalancedTent(state: CampState): string {
  return state.tents
    .map((tent) => ({
      id: tent.id,
      members: state.campers.filter((camper) => camper.active && camper.tentId === tent.id).length,
    }))
    .sort((a, b) => a.members - b.members)[0].id;
}

export function joinCamp(state: CampState, name: string, avatar: Avatar): CampState {
  const tentId = assignBalancedTent(state);
  const camper: Camper = {
    id: `camper-${Date.now()}`,
    name: name.trim(),
    avatar,
    tentId,
    active: true,
    isCurrent: true,
  };
  return { ...state, currentPlayerId: camper.id, campers: [...state.campers, camper] };
}

export function addScore(state: CampState, points: number, reason: string, playerId?: string): CampState {
  const targetId = playerId ?? state.currentPlayerId;
  const player = state.campers.find((camper) => camper.id === targetId);
  if (!player) return state;
  const entry: ScoreEntry = {
    id: `score-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    playerId: player.id,
    tentId: player.tentId,
    points,
    reason,
    createdAt: Date.now(),
  };
  return { ...state, scores: [...state.scores, entry] };
}

export function submitMission(state: CampState, missionId: string, evidence: string, points: number): CampState {
  const player = state.campers.find((camper) => camper.id === state.currentPlayerId);
  if (!player) return state;
  const submission: MissionSubmission = {
    id: `mission-${Date.now()}`,
    playerId: player.id,
    tentId: player.tentId,
    missionId,
    evidence,
    status: "pending",
    points,
    submittedAt: Date.now(),
  };
  return { ...state, missions: [...state.missions, submission] };
}

export function approveMission(state: CampState, submissionId: string): CampState {
  const submission = state.missions.find((item) => item.id === submissionId);
  if (!submission || submission.status !== "pending") return state;
  const next = {
    ...state,
    missions: state.missions.map((item) => item.id === submissionId ? { ...item, status: "approved" as const } : item),
  };
  return addScore(next, submission.points, "Tent mission approved", submission.playerId);
}

export function toggleGame(state: CampState, game: GameKey): CampState {
  return { ...state, gameOpen: { ...state.gameOpen, [game]: !state.gameOpen[game] } };
}
