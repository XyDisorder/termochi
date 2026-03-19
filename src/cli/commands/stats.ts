import pc from 'picocolors';
import { storage } from '../../infrastructure/storage/storage.js';
import { getMoodLabel, getMoodMessage, applyTimeDegradation } from '../../domain/pet/pet.logic.js';
import { formatAge, formatStatBar } from '../../utils/formatters.js';
import { formatElapsedTime, getElapsedMinutes, nowISO } from '../../infrastructure/clock/clock.js';
import { SPECIES_CATALOG } from '../../domain/species/species.catalog.js';
import { SPECIES_PREVIEW } from '../../ui/ascii/species-ascii.js';

export async function statsCommand(): Promise<void> {
  let state = storage.read();
  if (!state) {
    console.log(pc.yellow("No companion found. Run 'termochi' to get started!"));
    return;
  }

  // Apply degradation before showing stats
  const elapsed = getElapsedMinutes(state.lastSeenAt);
  if (elapsed > 1) {
    state = applyTimeDegradation(state, elapsed);
    storage.write({ ...state, lastSeenAt: nowISO() });
  }

  const species = SPECIES_CATALOG.find((s) => s.id === state.species);
  const moodLabel = getMoodLabel(state.stats);
  const moodMsg = getMoodMessage(state.name, state.stats);

  console.log('');
  console.log(pc.bold(pc.cyan(`  ✨ ${state.name} the ${species?.name ?? state.species}`)));
  console.log(`  ${pc.dim(moodMsg)}`);
  console.log('');

  // Print ASCII art
  const preview = SPECIES_PREVIEW[state.species];
  preview.forEach((line) => console.log(`  ${pc.cyan(line)}`));
  console.log('');

  const statColor = (v: number): ((s: string) => string) =>
    v < 25 ? pc.red : v < 50 ? pc.yellow : pc.green;

  console.log(`  Hunger:      ${statColor(state.stats.hunger)(formatStatBar(state.stats.hunger))} ${state.stats.hunger}%`);
  console.log(`  Energy:      ${statColor(state.stats.energy)(formatStatBar(state.stats.energy))} ${state.stats.energy}%`);
  console.log(`  Mood:        ${statColor(state.stats.mood)(formatStatBar(state.stats.mood))} ${state.stats.mood}%`);
  console.log(`  Cleanliness: ${statColor(state.stats.cleanliness)(formatStatBar(state.stats.cleanliness))} ${state.stats.cleanliness}%`);
  console.log(`  Health:      ${statColor(state.stats.health)(formatStatBar(state.stats.health))} ${state.stats.health}%`);

  console.log('');
  console.log(`  ${pc.dim(`Mood: ${moodLabel}  ·  Age: ${formatAge(state.createdAt)}  ·  Mode: ${state.gameMode}`)}`);
  console.log(`  ${pc.dim(`Last seen: ${formatElapsedTime(state.lastSeenAt)}`)}`);
  console.log('');
}
