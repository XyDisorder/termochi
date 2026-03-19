import { describe, it, expect } from 'vitest';
import { GAME_MODE_CONFIGS, getGameModeConfig } from '../src/domain/game/game-mode.logic.js';
import type { GameMode } from '../src/domain/pet/pet.types.js';

describe('GAME_MODE_CONFIGS', () => {
  it('contains exactly 3 modes', () => {
    expect(GAME_MODE_CONFIGS).toHaveLength(3);
  });

  it('has cozy, normal, and hardcore modes', () => {
    const ids = GAME_MODE_CONFIGS.map((m) => m.id);
    expect(ids).toContain('cozy');
    expect(ids).toContain('normal');
    expect(ids).toContain('hardcore');
  });

  it('cozy has multiplier < 1', () => {
    const cozy = getGameModeConfig('cozy');
    expect(cozy.degradationMultiplier).toBeLessThan(1);
  });

  it('normal has multiplier = 1', () => {
    const normal = getGameModeConfig('normal');
    expect(normal.degradationMultiplier).toBe(1);
  });

  it('hardcore has multiplier > 1', () => {
    const hardcore = getGameModeConfig('hardcore');
    expect(hardcore.degradationMultiplier).toBeGreaterThan(1);
  });

  it('each mode has required fields', () => {
    GAME_MODE_CONFIGS.forEach((config) => {
      expect(config.id).toBeDefined();
      expect(config.name).toBeDefined();
      expect(config.description.length).toBeGreaterThan(0);
      expect(config.example.length).toBeGreaterThan(0);
      expect(typeof config.degradationMultiplier).toBe('number');
    });
  });
});

describe('getGameModeConfig', () => {
  const modes: GameMode[] = ['cozy', 'normal', 'hardcore'];
  modes.forEach((mode) => {
    it(`returns config for ${mode}`, () => {
      const config = getGameModeConfig(mode);
      expect(config.id).toBe(mode);
    });
  });
});
