/**
 * termochi prompt
 * Outputs a compact one-liner for shell prompt / tmux statusline integration.
 * Intentionally has zero interactive UI — just writes to stdout and exits.
 */
import pc from 'picocolors';
import { storage } from '../../infrastructure/storage/storage.js';
import { applyTimeDegradation } from '../../domain/pet/pet.logic.js';
import { getMoodLabel } from '../../domain/pet/pet.logic.js';
import { getElapsedMinutes } from '../../infrastructure/clock/clock.js';
import type { MoodLabel, SpeciesId } from '../../domain/pet/pet.types.js';

const MOOD_EMOJI: Record<MoodLabel, string> = {
  euphoric: '🤩',
  happy:    '😊',
  calm:     '😌',
  tired:    '😴',
  hungry:   '😋',
  grumpy:   '😾',
  sick:     '🤒',
};

const SPECIES_EMOJI: Record<SpeciesId, string> = {
  blob:   '🫧',
  neko:   '🐱',
  bot:    '🤖',
  sprout: '🌱',
};

export async function promptCommand(opts: { compact?: boolean } = {}): Promise<void> {
  const state = storage.read();
  if (!state) {
    // Silent when no pet — prompt stays clean
    return;
  }

  // Apply time degradation without saving (read-only for prompt)
  const elapsed = getElapsedMinutes(state.lastSeenAt);
  const current = elapsed > 1 ? applyTimeDegradation(state, elapsed) : state;

  const mood = getMoodLabel(current.stats);
  const moodEmoji = MOOD_EMOJI[mood];
  const speciesEmoji = SPECIES_EMOJI[state.species];

  // Alert indicator when any stat is critically low
  const minStat = Math.min(...Object.values(current.stats));
  const alert = minStat < 20 ? pc.red(' !') : '';

  if (opts.compact) {
    // Even shorter — for tmux statusline right side
    process.stdout.write(`${speciesEmoji}${moodEmoji}${alert}`);
  } else {
    // Full prompt segment
    process.stdout.write(`${speciesEmoji} ${pc.bold(state.name)} ${moodEmoji}${alert}`);
  }
}
