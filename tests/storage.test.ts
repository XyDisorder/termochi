import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { petStateSchema } from '../src/infrastructure/storage/storage.schemas.js';
import type { PetState } from '../src/domain/pet/pet.types.js';

// Test the Zod schema validation, not file I/O
describe('petStateSchema', () => {
  const validPet: PetState = {
    id: 'abc-123',
    name: 'Mochi',
    species: 'blob',
    gameMode: 'normal',
    theme: 'pastel',
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    stats: {
      hunger: 80,
      energy: 70,
      mood: 75,
      cleanliness: 90,
      health: 95,
    },
    traits: {
      playfulness: 60,
      calmness: 40,
      appetite: 70,
    },
  };

  it('validates a valid pet state', () => {
    const result = petStateSchema.safeParse(validPet);
    expect(result.success).toBe(true);
  });

  it('rejects invalid species', () => {
    const result = petStateSchema.safeParse({ ...validPet, species: 'dragon' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid game mode', () => {
    const result = petStateSchema.safeParse({ ...validPet, gameMode: 'impossible' });
    expect(result.success).toBe(false);
  });

  it('rejects stats above 100', () => {
    const result = petStateSchema.safeParse({
      ...validPet,
      stats: { ...validPet.stats, hunger: 150 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects stats below 0', () => {
    const result = petStateSchema.safeParse({
      ...validPet,
      stats: { ...validPet.stats, health: -1 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const { name, ...withoutName } = validPet;
    const result = petStateSchema.safeParse(withoutName);
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = petStateSchema.safeParse({ ...validPet, name: '' });
    expect(result.success).toBe(false);
  });
});
