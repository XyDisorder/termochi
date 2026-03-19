import type { Species } from './species.types.js';

export const SPECIES_CATALOG: Species[] = [
  {
    id: 'blob',
    name: 'Blob',
    description: 'A round, squishy companion with a big appetite.',
    temperament: 'happy',
    defaultMood: 'joyful',
    tendency: 'Loves eating, quick to forgive.',
    statBonuses: { hunger: 5, mood: 5 },
    traitBonuses: { appetite: 20, calmness: 10 },
  },
  {
    id: 'neko',
    name: 'Neko',
    description: 'A curious terminal cat, quick and playful.',
    temperament: 'playful',
    defaultMood: 'playful',
    tendency: 'Loves playing, needs more attention.',
    statBonuses: { mood: 10, energy: 5 },
    traitBonuses: { playfulness: 25, appetite: -10 },
  },
  {
    id: 'bot',
    name: 'Bot',
    description: 'A mini companion bot, stable and disciplined.',
    temperament: 'calm',
    defaultMood: 'calm',
    tendency: 'Loses energy slowly, stays tidy.',
    statBonuses: { energy: 10, cleanliness: 10 },
    traitBonuses: { calmness: 25 },
  },
  {
    id: 'sprout',
    name: 'Sprout',
    description: 'A tiny digital seedling, gentle and peaceful.',
    temperament: 'serene',
    defaultMood: 'serene',
    tendency: 'Loves rest and cleanliness.',
    statBonuses: { cleanliness: 15, mood: 5 },
    traitBonuses: { calmness: 15, playfulness: -5 },
  },
];
