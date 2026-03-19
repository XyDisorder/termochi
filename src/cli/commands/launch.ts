import React from 'react';
import { render } from 'ink';
import { storage } from '../../infrastructure/storage/storage.js';
import { applyTimeDegradation } from '../../domain/pet/pet.logic.js';
import { getElapsedMinutes, nowISO } from '../../infrastructure/clock/clock.js';
import { maybeGenerateEvent, applyEventStats } from '../../domain/events/random-events.js';
import type { PetEvent } from '../../domain/events/random-events.js';
import { App } from '../../app/App.js';

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

  const { waitUntilExit } = render(
    React.createElement(App, { initialPet: pet, initialEvent })
  );
  await waitUntilExit();
}
