export type EvolutionTier = 'egg' | 'baby' | 'young' | 'adult' | 'veteran';

export interface EvolutionInfo {
  tier: EvolutionTier;
  days: number;
  badge: string;
  label: string;
  nextAt: number | null; // days until next tier, null if max
}

const TIERS: Array<{ tier: EvolutionTier; minDays: number; badge: string; label: string }> = [
  { tier: 'egg',     minDays: 0,   badge: '🥚', label: 'Egg'     },
  { tier: 'baby',    minDays: 1,   badge: '🐣', label: 'Baby'    },
  { tier: 'young',   minDays: 7,   badge: '🌱', label: 'Young'   },
  { tier: 'adult',   minDays: 30,  badge: '✦',  label: 'Adult'   },
  { tier: 'veteran', minDays: 90,  badge: '★',  label: 'Veteran' },
];

export function getEvolutionInfo(createdAt: string): EvolutionInfo {
  const days = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;

  let current = TIERS[0]!;
  for (const t of TIERS) {
    if (days >= t.minDays) current = t;
  }

  const currentIdx = TIERS.indexOf(current);
  const next = TIERS[currentIdx + 1];
  const nextAt = next ? next.minDays - days : null;

  return {
    tier: current.tier,
    days: Math.floor(days),
    badge: current.badge,
    label: current.label,
    nextAt: nextAt !== null ? Math.ceil(nextAt) : null,
  };
}
