import type { PetAction, PetStats } from './pet.types.js';

export const STAT_MIN = 0;
export const STAT_MAX = 100;

/** Base stat degradation per hour at normal mode */
export const BASE_DEGRADATION_PER_HOUR: Omit<PetStats, 'health'> & { health: number } = {
  hunger: 5, // hunger drops (pet gets hungrier)
  energy: 8,
  mood: 4,
  cleanliness: 3,
  health: 1,
};

/** Extra health degradation per hour when a stat is critically low (< 20) */
export const CRITICAL_HEALTH_PENALTY: Record<keyof Omit<PetStats, 'health'>, number> = {
  hunger: 5,
  energy: 3,
  cleanliness: 2,
  mood: 1,
};

/** Stat changes when an action is performed */
export const ACTION_EFFECTS: Record<PetAction, Partial<PetStats>> = {
  feed: { hunger: 30, mood: 5, cleanliness: -3 },
  play: { mood: 20, energy: -15, hunger: -10 },
  sleep: { energy: 40, hunger: -5 },
  clean: { cleanliness: 40, mood: 5 },
  heal: { health: 30, energy: -10 },
  talk: { mood: 10 },
};

/** Cooldown in minutes before an action can be used again */
export const ACTION_COOLDOWNS: Record<PetAction, number> = {
  feed:  45,
  play:  30,
  sleep: 120,
  clean: 90,
  heal:  180,
  talk:  5,
};

/** Stat gate: action is blocked when the target stat is already too high (or too low for play) */
export const ACTION_STAT_GATES: Record<PetAction, ((stats: PetStats) => string | null)> = {
  feed:  (s) => (s.hunger  >= 88 ? 'already full'    : null),
  play:  (s) => (s.energy  <= 15 ? 'too tired'        : s.health <= 20 ? 'too sick'      : null),
  sleep: (s) => (s.energy  >= 88 ? 'not tired yet'    : null),
  clean: (s) => (s.cleanliness >= 88 ? 'already clean': null),
  heal:  (s) => (s.health  >= 88 ? 'already healthy'  : null),
  talk:  (_) => null,
};

export const ACTION_MESSAGES: Record<PetAction, (name: string) => string[]> = {
  feed: (n) => [
    `${n} munches happily. ✨`,
    `${n} looks at you with gratitude.`,
    `Nom nom nom. ${n} loved that snack!`,
  ],
  play: (n) => [
    `${n} zooms around excitedly!`,
    `${n} is having so much fun!`,
    `Playtime with ${n} was a success!`,
  ],
  sleep: (n) => [
    `${n} curls up and drifts off...`,
    `Shh... ${n} is dreaming.`,
    `${n} yawns and closes their eyes.`,
  ],
  clean: (n) => [
    `${n} is sparkling clean now!`,
    `Fresh and cozy! ${n} smells great.`,
    `${n} enjoyed the grooming session.`,
  ],
  heal: (n) => [
    `${n} is feeling a bit better.`,
    `Medicine time. ${n} trusts you.`,
    `${n} is on the mend!`,
  ],
  talk: (n) => [
    `${n} listens attentively.`,
    `${n} chirps back at you!`,
    `${n} feels heard. 💙`,
  ],
};
