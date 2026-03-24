import type { GameMode, PetState, SpeciesId, ThemeId } from './pet.types.js';
import { SPECIES_CATALOG } from '../species/species.catalog.js';
import { clamp } from '../../utils/math.js';
import { STAT_MAX } from './pet.constants.js';

interface CreatePetParams {
  name: string;
  species: SpeciesId;
  gameMode: GameMode;
  theme: ThemeId;
}

const BASE_STATS = {
  hunger: 100,
  energy: 100,
  mood: 100,
  cleanliness: 100,
  health: 100,
};

const BASE_TRAITS = {
  playfulness: 50,
  calmness: 50,
  appetite: 50,
};

export function createPet(params: CreatePetParams): PetState {
  const species = SPECIES_CATALOG.find((s) => s.id === params.species);
  if (!species) {
    throw new Error(`Unknown species: ${params.species}`);
  }
  const now = new Date().toISOString();

  const stats = {
    hunger: clamp(BASE_STATS.hunger + (species.statBonuses.hunger ?? 0), 0, STAT_MAX),
    energy: clamp(BASE_STATS.energy + (species.statBonuses.energy ?? 0), 0, STAT_MAX),
    mood: clamp(BASE_STATS.mood + (species.statBonuses.mood ?? 0), 0, STAT_MAX),
    cleanliness: clamp(
      BASE_STATS.cleanliness + (species.statBonuses.cleanliness ?? 0),
      0,
      STAT_MAX
    ),
    health: clamp(BASE_STATS.health + (species.statBonuses.health ?? 0), 0, STAT_MAX),
  };

  const traits = {
    playfulness: clamp(
      BASE_TRAITS.playfulness + (species.traitBonuses.playfulness ?? 0),
      0,
      STAT_MAX
    ),
    calmness: clamp(BASE_TRAITS.calmness + (species.traitBonuses.calmness ?? 0), 0, STAT_MAX),
    appetite: clamp(BASE_TRAITS.appetite + (species.traitBonuses.appetite ?? 0), 0, STAT_MAX),
  };

  return {
    id: crypto.randomUUID(),
    name: params.name,
    species: params.species,
    gameMode: params.gameMode,
    theme: params.theme,
    createdAt: now,
    lastSeenAt: now,
    stats,
    traits,
  };
}
