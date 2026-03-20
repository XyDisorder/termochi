import type { ActionCheck, MoodLabel, PetAction, PetState, PetStats } from './pet.types.js';
import {
  ACTION_COOLDOWNS,
  ACTION_EFFECTS,
  ACTION_MESSAGES,
  ACTION_STAT_GATES,
  BASE_DEGRADATION_PER_HOUR,
  CRITICAL_HEALTH_PENALTY,
  STAT_MAX,
  STAT_MIN,
} from './pet.constants.js';
import { getGameModeConfig } from '../game/game-mode.logic.js';
import { clamp, randomItem } from '../../utils/math.js';

function clampStats(stats: PetStats): PetStats {
  return {
    hunger: clamp(stats.hunger, STAT_MIN, STAT_MAX),
    energy: clamp(stats.energy, STAT_MIN, STAT_MAX),
    mood: clamp(stats.mood, STAT_MIN, STAT_MAX),
    cleanliness: clamp(stats.cleanliness, STAT_MIN, STAT_MAX),
    health: clamp(stats.health, STAT_MIN, STAT_MAX),
  };
}

export function applyTimeDegradation(state: PetState, elapsedMinutes: number): PetState {
  const hours = elapsedMinutes / 60;
  const modeConfig = getGameModeConfig(state.gameMode);
  const multiplier = modeConfig.degradationMultiplier;

  // Degrade each stat
  let hunger = state.stats.hunger - BASE_DEGRADATION_PER_HOUR.hunger * hours * multiplier;
  let energy = state.stats.energy - BASE_DEGRADATION_PER_HOUR.energy * hours * multiplier;
  let mood = state.stats.mood - BASE_DEGRADATION_PER_HOUR.mood * hours * multiplier;
  let cleanliness =
    state.stats.cleanliness - BASE_DEGRADATION_PER_HOUR.cleanliness * hours * multiplier;
  let health = state.stats.health - BASE_DEGRADATION_PER_HOUR.health * hours * multiplier;

  // Apply critical health penalties when stats are critically low (< 20) before clamping
  const preClampHunger = hunger;
  const preClampEnergy = energy;
  const preClampMood = mood;
  const preClampCleanliness = cleanliness;

  if (preClampHunger < 20) {
    health -= CRITICAL_HEALTH_PENALTY.hunger * hours * multiplier;
  }
  if (preClampEnergy < 20) {
    health -= CRITICAL_HEALTH_PENALTY.energy * hours * multiplier;
  }
  if (preClampCleanliness < 20) {
    health -= CRITICAL_HEALTH_PENALTY.cleanliness * hours * multiplier;
  }
  if (preClampMood < 20) {
    health -= CRITICAL_HEALTH_PENALTY.mood * hours * multiplier;
  }

  const updatedStats = clampStats({
    hunger,
    energy,
    mood,
    cleanliness,
    health,
  });

  return {
    ...state,
    stats: updatedStats,
    lastSeenAt: new Date().toISOString(),
  };
}

export type TaskStressLevel = 'none' | 'low' | 'high';

export function applyTaskStress(state: PetState, level: TaskStressLevel): PetState {
  if (level === 'none') return state;
  const moodDrop = level === 'high' ? 12 : 6;
  return {
    ...state,
    stats: clampStats({ ...state.stats, mood: state.stats.mood - moodDrop }),
  };
}

export function canPerformAction(state: PetState, action: PetAction): ActionCheck {
  // Stat gate check
  const gateMessage = ACTION_STAT_GATES[action](state.stats);
  if (gateMessage !== null) {
    return { allowed: false, reason: 'stat', message: gateMessage };
  }

  // Cooldown check
  const lastUsedAt = state.lastActions?.[action];
  if (lastUsedAt) {
    const elapsedMinutes = (Date.now() - new Date(lastUsedAt).getTime()) / 1000 / 60;
    const cooldown = ACTION_COOLDOWNS[action];
    if (elapsedMinutes < cooldown) {
      return {
        allowed: false,
        reason: 'cooldown',
        remainingMinutes: Math.ceil(cooldown - elapsedMinutes),
      };
    }
  }

  return { allowed: true };
}

export function applyAction(
  state: PetState,
  action: PetAction,
  scoreBonus?: number
): { state: PetState; message: string } {
  const base = ACTION_EFFECTS[action];
  // For 'play', scale mood effect based on mini-game score (0–10+)
  // For 'feed', scale hunger effect based on mini-game score (0–10+)
  const effects: Partial<typeof base> =
    action === 'play' && scoreBonus !== undefined
      ? { ...base, mood: Math.min(10 + scoreBonus * 4, 50) }
      : action === 'feed' && scoreBonus !== undefined
        ? { ...base, hunger: Math.min(15 + scoreBonus * 5, 60) }
        : base;
  const updatedStats = clampStats({
    hunger: state.stats.hunger + (effects.hunger ?? 0),
    energy: state.stats.energy + (effects.energy ?? 0),
    mood: state.stats.mood + (effects.mood ?? 0),
    cleanliness: state.stats.cleanliness + (effects.cleanliness ?? 0),
    health: state.stats.health + (effects.health ?? 0),
  });

  const messages = ACTION_MESSAGES[action](state.name);
  const message = randomItem(messages);

  return {
    state: {
      ...state,
      stats: updatedStats,
      lastSeenAt: new Date().toISOString(),
      lastActions: { ...state.lastActions, [action]: new Date().toISOString() },
    },
    message,
  };
}

export function getMoodLabel(stats: PetStats): MoodLabel {
  if (stats.health < 30) return 'sick';
  if (stats.mood < 20) return 'grumpy';
  if (stats.hunger < 20) return 'hungry';
  if (stats.energy < 20) return 'tired';
  if (stats.mood >= 80 && stats.health >= 70) return 'euphoric';
  if (stats.mood >= 60) return 'happy';
  if (stats.mood >= 40) return 'calm';
  return 'tired';
}

export function getMoodMessage(name: string, stats: PetStats): string {
  const label = getMoodLabel(stats);
  switch (label) {
    case 'euphoric':
      return `${name} is absolutely thriving!`;
    case 'happy':
      return `${name} is feeling pretty good today.`;
    case 'calm':
      return `${name} is content and relaxed.`;
    case 'tired':
      return `${name} looks sleepy and worn out...`;
    case 'hungry':
      return `${name}'s tummy is rumbling...`;
    case 'grumpy':
      return `${name} is feeling grumpy. Maybe some attention would help?`;
    case 'sick':
      return `${name} isn't feeling well. Please take care of them!`;
  }
}
