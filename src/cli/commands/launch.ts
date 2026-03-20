import React from 'react';
import { render } from 'ink';
import { storage } from '../../infrastructure/storage/storage.js';
import { applyTimeDegradation } from '../../domain/pet/pet.logic.js';
import { getElapsedMinutes, nowISO } from '../../infrastructure/clock/clock.js';
import { maybeGenerateEvent, applyEventStats } from '../../domain/events/random-events.js';
import type { PetEvent } from '../../domain/events/random-events.js';
import { App } from '../../app/App.js';
import { sendNotification } from '../../utils/notify.js';

export async function launchApp(): Promise<void> {
  let pet = storage.read();
  let initialEvent: PetEvent | null = null;

  if (pet) {
    const elapsed = getElapsedMinutes(pet.lastSeenAt);
    if (elapsed > 1) {
      pet = applyTimeDegradation(pet, elapsed);
      initialEvent = maybeGenerateEvent(elapsed);
      if (initialEvent) {
        pet = { ...pet, stats: applyEventStats(pet.stats, initialEvent) };
      }
      storage.write({ ...pet, lastSeenAt: nowISO() });
    }
  }

  // Check critical stats and notify
  if (pet) {
    const { stats, name } = pet;
    const criticals: string[] = [];
    if (stats.hunger < 20) criticals.push('hungry');
    if (stats.energy < 20) criticals.push('exhausted');
    if (stats.health < 20) criticals.push('sick');
    if (stats.mood < 20) criticals.push('sad');
    if (stats.cleanliness < 20) criticals.push('dirty');
    if (criticals.length > 0) {
      sendNotification(
        `${name} needs you! 🆘`,
        `${name} is ${criticals.join(', ')}. Open termochi to help!`
      );
    }
  }

  const { waitUntilExit } = render(
    React.createElement(App, { initialPet: pet, initialEvent })
  );
  await waitUntilExit();
}
