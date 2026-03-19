import type { PetStats } from '../pet/pet.types.js';
import { randomItem } from '../../utils/math.js';

export interface PetEvent {
  id: string;
  emoji: string;
  title: string;
  description: string;
  statDelta: Partial<PetStats>;
}

const POSSIBLE_EVENTS: PetEvent[] = [
  {
    id: 'found_snack',
    emoji: '🍪',
    title: 'Found a snack!',
    description: 'Your companion discovered a hidden treat while you were away.',
    statDelta: { hunger: 15 },
  },
  {
    id: 'good_dream',
    emoji: '🌙',
    title: 'Sweet dreams',
    description: 'Had the most wonderful dreams. Feeling refreshed!',
    statDelta: { mood: 12, energy: 8 },
  },
  {
    id: 'nightmare',
    emoji: '😰',
    title: 'Nightmare...',
    description: 'Tossed and turned all night. Not a great sleep.',
    statDelta: { mood: -15, energy: -10 },
  },
  {
    id: 'mischief',
    emoji: '🙈',
    title: 'Got into mischief',
    description: 'Made quite a mess while you were gone...',
    statDelta: { cleanliness: -20 },
  },
  {
    id: 'new_friend',
    emoji: '🌟',
    title: 'Made a new friend!',
    description: 'Met someone interesting in the digital world!',
    statDelta: { mood: 20 },
  },
  {
    id: 'rainy_day',
    emoji: '☔',
    title: 'Cozy rainy day',
    description: 'Stayed indoors and watched the rain. Very cozy.',
    statDelta: { mood: 8, energy: -5 },
  },
  {
    id: 'caught_cold',
    emoji: '🤧',
    title: 'Caught a cold',
    description: "Feeling a bit under the weather today.",
    statDelta: { health: -12, energy: -8 },
  },
  {
    id: 'sunny_day',
    emoji: '☀️',
    title: 'Beautiful day!',
    description: 'The vibes were absolutely immaculate.',
    statDelta: { mood: 15 },
  },
  {
    id: 'found_coin',
    emoji: '🪙',
    title: 'Found something shiny',
    description: 'Discovered a mysterious glowing pixel. Fascinating!',
    statDelta: { mood: 10 },
  },
  {
    id: 'overexercised',
    emoji: '😮‍💨',
    title: 'Overdid it a bit',
    description: 'Tried to play alone. Got tired.',
    statDelta: { energy: -12, hunger: -10 },
  },
];

/** Returns a random event based on elapsed time, or null if no event fires */
export function maybeGenerateEvent(elapsedMinutes: number): PetEvent | null {
  // Probability grows with absence: ~0% at <30min, 30% at 4h, 60% at 12h+
  const hours = elapsedMinutes / 60;
  const chance = Math.min((hours - 0.5) / 12 * 60, 60);
  if (chance <= 0 || Math.random() * 100 > chance) return null;
  return randomItem(POSSIBLE_EVENTS);
}

/** Apply an event's stat delta to a stats object (clamp to 0-100) */
export function applyEventStats(stats: PetStats, event: PetEvent): PetStats {
  return {
    hunger:      Math.min(100, Math.max(0, stats.hunger      + (event.statDelta.hunger      ?? 0))),
    energy:      Math.min(100, Math.max(0, stats.energy      + (event.statDelta.energy      ?? 0))),
    mood:        Math.min(100, Math.max(0, stats.mood        + (event.statDelta.mood        ?? 0))),
    cleanliness: Math.min(100, Math.max(0, stats.cleanliness + (event.statDelta.cleanliness ?? 0))),
    health:      Math.min(100, Math.max(0, stats.health      + (event.statDelta.health      ?? 0))),
  };
}
