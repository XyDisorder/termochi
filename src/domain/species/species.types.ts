import type { PetStats, PetTraits, SpeciesId } from '../pet/pet.types.js';

export interface Species {
  id: SpeciesId;
  name: string;
  description: string;
  temperament: string;
  defaultMood: string;
  tendency: string;
  statBonuses: Partial<PetStats>;
  traitBonuses: Partial<PetTraits>;
}
