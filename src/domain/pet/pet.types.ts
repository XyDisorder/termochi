export type SpeciesId = 'blob' | 'neko' | 'bot' | 'sprout';
export type GameMode = 'cozy' | 'normal' | 'hardcore';
export type ThemeId = 'pastel' | 'terminal-green' | 'cyber-neon' | 'sunset' | 'mono';
export type MoodLabel = 'euphoric' | 'happy' | 'calm' | 'tired' | 'hungry' | 'grumpy' | 'sick';
export type PetAction = 'feed' | 'play' | 'sleep' | 'clean' | 'heal' | 'talk';

export interface PetStats {
  hunger: number; // 0–100 (100 = full)
  energy: number; // 0–100
  mood: number; // 0–100
  cleanliness: number; // 0–100
  health: number; // 0–100
}

export interface PetTraits {
  playfulness: number; // 0–100
  calmness: number; // 0–100
  appetite: number; // 0–100
}

export interface PetState {
  id: string;
  name: string;
  species: SpeciesId;
  gameMode: GameMode;
  theme: ThemeId;
  createdAt: string; // ISO 8601
  lastSeenAt: string; // ISO 8601
  stats: PetStats;
  traits: PetTraits;
  lastActions?: Partial<Record<PetAction, string>>; // ISO timestamps of last action use
  deathCount?: number; // total times this save slot has had a pet die
}

export type ActionCheck =
  | { allowed: true }
  | { allowed: false; reason: 'cooldown'; remainingMinutes: number }
  | { allowed: false; reason: 'stat'; message: string };
