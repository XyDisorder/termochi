import type { GameMode } from '../pet/pet.types.js';

export interface GameModeConfig {
  id: GameMode;
  name: string;
  description: string;
  example: string;
  degradationMultiplier: number;
}
