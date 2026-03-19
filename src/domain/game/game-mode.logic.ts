import type { GameMode } from '../pet/pet.types.js';
import type { GameModeConfig } from './game-mode.types.js';

export const GAME_MODE_CONFIGS: GameModeConfig[] = [
  {
    id: 'cozy',
    name: 'Cozy',
    description:
      'A relaxed experience. Stats drop slowly and your companion is forgiving of absences.',
    example:
      'After 8h away: mild hunger, slightly low mood. Perfect for a chill companion.',
    degradationMultiplier: 0.5,
  },
  {
    id: 'normal',
    name: 'Normal',
    description: 'The balanced experience. Needs evolve at a natural pace.',
    example: 'After 8h away: notable hunger, low energy, needs attention.',
    degradationMultiplier: 1.0,
  },
  {
    id: 'hardcore',
    name: 'Hardcore',
    description:
      'Real responsibility mode. Stats drop fast and absences have real consequences.',
    example:
      'After 8h away: very hungry, poor mood, messy space. A true challenge.',
    degradationMultiplier: 2.0,
  },
];

export function getGameModeConfig(mode: GameMode): GameModeConfig {
  const config = GAME_MODE_CONFIGS.find((c) => c.id === mode);
  if (!config) {
    throw new Error(`Unknown game mode: ${mode}`);
  }
  return config;
}
