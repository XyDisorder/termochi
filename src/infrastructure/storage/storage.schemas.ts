import { z } from 'zod';

const petStatsSchema = z.object({
  hunger: z.number().min(0).max(100),
  energy: z.number().min(0).max(100),
  mood: z.number().min(0).max(100),
  cleanliness: z.number().min(0).max(100),
  health: z.number().min(0).max(100),
});

const petTraitsSchema = z.object({
  playfulness: z.number().min(0).max(100),
  calmness: z.number().min(0).max(100),
  appetite: z.number().min(0).max(100),
});

const lastActionsSchema = z
  .object({
    feed:  z.string().optional(),
    play:  z.string().optional(),
    sleep: z.string().optional(),
    clean: z.string().optional(),
    heal:  z.string().optional(),
    talk:  z.string().optional(),
  })
  .optional();

export const petStateSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  species: z.enum(['blob', 'neko', 'bot', 'sprout']),
  gameMode: z.enum(['cozy', 'normal', 'hardcore']),
  theme: z.enum(['pastel', 'terminal-green', 'cyber-neon', 'sunset', 'mono']),
  createdAt: z.string(),
  lastSeenAt: z.string(),
  stats: petStatsSchema,
  traits: petTraitsSchema,
  lastActions: lastActionsSchema,
  deathCount: z.number().optional(),
});

export type PetStateSchema = z.infer<typeof petStateSchema>;
