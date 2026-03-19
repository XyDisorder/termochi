import pc from 'picocolors';
import { storage } from '../../infrastructure/storage/storage.js';
import { applyAction } from '../../domain/pet/pet.logic.js';
import { nowISO } from '../../infrastructure/clock/clock.js';
import { formatStatBar } from '../../utils/formatters.js';

export async function sleepCommand(): Promise<void> {
  const state = storage.read();
  if (!state) {
    console.log(pc.yellow("No companion found. Run 'termochi' to get started!"));
    return;
  }

  const { state: newState, message } = applyAction(state, 'sleep');
  storage.write({ ...newState, lastSeenAt: nowISO() });

  console.log(pc.green(`✓ ${message}`));
  console.log(`  Energy:    ${formatStatBar(newState.stats.energy)}`);
  console.log(`  Hunger:    ${formatStatBar(newState.stats.hunger)}`);
}
