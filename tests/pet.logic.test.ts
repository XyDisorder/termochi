import { describe, it, expect } from 'vitest';
import { applyTimeDegradation, applyAction, getMoodLabel } from '../src/domain/pet/pet.logic.js';
import type { PetState } from '../src/domain/pet/pet.types.js';

// Helper to create a test pet
function makePet(overrides: Partial<PetState> = {}): PetState {
  return {
    id: 'test-id',
    name: 'Pip',
    species: 'blob',
    gameMode: 'normal',
    theme: 'pastel',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    lastSeenAt: new Date().toISOString(),
    stats: {
      hunger: 80,
      energy: 80,
      mood: 80,
      cleanliness: 80,
      health: 90,
    },
    traits: {
      playfulness: 50,
      calmness: 50,
      appetite: 50,
    },
    ...overrides,
  };
}

describe('applyTimeDegradation', () => {
  it('reduces stats after elapsed time', () => {
    const pet = makePet();
    const result = applyTimeDegradation(pet, 60); // 60 minutes = 1 hour
    expect(result.stats.hunger).toBeLessThan(pet.stats.hunger);
    expect(result.stats.energy).toBeLessThan(pet.stats.energy);
    expect(result.stats.mood).toBeLessThan(pet.stats.mood);
  });

  it('clamps stats to 0 minimum', () => {
    const pet = makePet({ stats: { hunger: 1, energy: 1, mood: 1, cleanliness: 1, health: 1 } });
    const result = applyTimeDegradation(pet, 600); // 10 hours
    expect(result.stats.hunger).toBeGreaterThanOrEqual(0);
    expect(result.stats.energy).toBeGreaterThanOrEqual(0);
    expect(result.stats.mood).toBeGreaterThanOrEqual(0);
    expect(result.stats.cleanliness).toBeGreaterThanOrEqual(0);
    expect(result.stats.health).toBeGreaterThanOrEqual(0);
  });

  it('clamps stats to 100 maximum', () => {
    const pet = makePet({ stats: { hunger: 100, energy: 100, mood: 100, cleanliness: 100, health: 100 } });
    const result = applyTimeDegradation(pet, 0); // no time passed
    expect(result.stats.hunger).toBeLessThanOrEqual(100);
    expect(result.stats.energy).toBeLessThanOrEqual(100);
  });

  it('cozy mode degrades slower than normal', () => {
    const normal = makePet({ gameMode: 'normal' });
    const cozy = makePet({ gameMode: 'cozy' });
    const normalResult = applyTimeDegradation(normal, 120);
    const cozyResult = applyTimeDegradation(cozy, 120);
    expect(cozyResult.stats.hunger).toBeGreaterThan(normalResult.stats.hunger);
    expect(cozyResult.stats.energy).toBeGreaterThan(normalResult.stats.energy);
  });

  it('hardcore mode degrades faster than normal', () => {
    const normal = makePet({ gameMode: 'normal' });
    const hardcore = makePet({ gameMode: 'hardcore' });
    const normalResult = applyTimeDegradation(normal, 120);
    const hardcoreResult = applyTimeDegradation(hardcore, 120);
    expect(hardcoreResult.stats.hunger).toBeLessThan(normalResult.stats.hunger);
    expect(hardcoreResult.stats.energy).toBeLessThan(normalResult.stats.energy);
  });

  it('applies extra health penalty when hunger is critically low', () => {
    const healthy = makePet({ stats: { hunger: 80, energy: 80, mood: 80, cleanliness: 80, health: 90 } });
    const starving = makePet({ stats: { hunger: 10, energy: 80, mood: 80, cleanliness: 80, health: 90 } });
    const healthyResult = applyTimeDegradation(healthy, 60);
    const starvingResult = applyTimeDegradation(starving, 60);
    // Starving pet should lose more health
    const healthLossHealthy = 90 - healthyResult.stats.health;
    const healthLossStarving = 90 - starvingResult.stats.health;
    expect(healthLossStarving).toBeGreaterThan(healthLossHealthy);
  });

  it('does not degrade with 0 elapsed minutes', () => {
    const pet = makePet();
    const result = applyTimeDegradation(pet, 0);
    expect(result.stats.hunger).toBe(pet.stats.hunger);
    expect(result.stats.energy).toBe(pet.stats.energy);
  });
});

describe('applyAction', () => {
  it('feed increases hunger stat', () => {
    const pet = makePet({ stats: { hunger: 40, energy: 80, mood: 80, cleanliness: 80, health: 90 } });
    const { state } = applyAction(pet, 'feed');
    expect(state.stats.hunger).toBeGreaterThan(40);
  });

  it('play increases mood but decreases energy', () => {
    const pet = makePet({ stats: { hunger: 80, energy: 80, mood: 50, cleanliness: 80, health: 90 } });
    const { state } = applyAction(pet, 'play');
    expect(state.stats.mood).toBeGreaterThan(50);
    expect(state.stats.energy).toBeLessThan(80);
  });

  it('sleep increases energy', () => {
    const pet = makePet({ stats: { hunger: 80, energy: 30, mood: 80, cleanliness: 80, health: 90 } });
    const { state } = applyAction(pet, 'sleep');
    expect(state.stats.energy).toBeGreaterThan(30);
  });

  it('clean increases cleanliness', () => {
    const pet = makePet({ stats: { hunger: 80, energy: 80, mood: 80, cleanliness: 20, health: 90 } });
    const { state } = applyAction(pet, 'clean');
    expect(state.stats.cleanliness).toBeGreaterThan(20);
  });

  it('heal increases health', () => {
    const pet = makePet({ stats: { hunger: 80, energy: 60, mood: 80, cleanliness: 80, health: 40 } });
    const { state } = applyAction(pet, 'heal');
    expect(state.stats.health).toBeGreaterThan(40);
  });

  it('stats stay within [0, 100] bounds', () => {
    const pet = makePet({ stats: { hunger: 100, energy: 100, mood: 100, cleanliness: 100, health: 100 } });
    const { state } = applyAction(pet, 'feed');
    Object.values(state.stats).forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    });
  });

  it('returns a non-empty message string', () => {
    const pet = makePet();
    const { message } = applyAction(pet, 'talk');
    expect(typeof message).toBe('string');
    expect(message.length).toBeGreaterThan(0);
  });
});

describe('getMoodLabel', () => {
  it('returns "sick" when health is very low', () => {
    const stats = { hunger: 80, energy: 80, mood: 80, cleanliness: 80, health: 20 };
    expect(getMoodLabel(stats)).toBe('sick');
  });

  it('returns "euphoric" when mood and health are high', () => {
    const stats = { hunger: 80, energy: 80, mood: 90, cleanliness: 80, health: 80 };
    expect(getMoodLabel(stats)).toBe('euphoric');
  });

  it('returns "hungry" when hunger is very low', () => {
    const stats = { hunger: 10, energy: 80, mood: 60, cleanliness: 80, health: 80 };
    expect(getMoodLabel(stats)).toBe('hungry');
  });

  it('returns "tired" when energy is very low', () => {
    const stats = { hunger: 80, energy: 10, mood: 60, cleanliness: 80, health: 80 };
    expect(getMoodLabel(stats)).toBe('tired');
  });

  it('returns "happy" for decent stats', () => {
    const stats = { hunger: 70, energy: 70, mood: 70, cleanliness: 70, health: 70 };
    expect(getMoodLabel(stats)).toBe('happy');
  });
});
