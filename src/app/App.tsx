import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import type { PetState, PetAction } from '../domain/pet/pet.types.js';
import type { PetEvent } from '../domain/events/random-events.js';
import { applyAction } from '../domain/pet/pet.logic.js';
import { storage } from '../infrastructure/storage/storage.js';
import { getTheme } from '../domain/theme/theme.catalog.js';
import { nowISO } from '../infrastructure/clock/clock.js';
import { OnboardingScreen } from '../ui/screens/OnboardingScreen.js';
import { MainScreen } from '../ui/screens/MainScreen.js';
import { StatsScreen } from '../ui/screens/StatsScreen.js';
import { PlayGameScreen } from '../ui/screens/PlayGameScreen.js';
import { FeedGameScreen } from '../ui/screens/FeedGameScreen.js';

export type AppScreen = 'main' | 'stats' | 'play-game' | 'feed-game';

interface AppProps {
  initialPet: PetState | null;
  initialEvent?: PetEvent | null;
}

export const App: React.FC<AppProps> = ({ initialPet, initialEvent }) => {
  const [pet, setPet] = useState<PetState | null>(initialPet);
  const [screen, setScreen] = useState<AppScreen>('main');
  const [isOnboarding, setIsOnboarding] = useState(initialPet === null);

  const handleOnboardingComplete = useCallback((newPet: PetState) => {
    storage.write(newPet);
    setPet(newPet);
    setIsOnboarding(false);
  }, []);

  const handleAction = useCallback(
    (action: PetAction, scoreBonus?: number): string => {
      if (!pet) return '';
      const { state: newState, message } = applyAction(pet, action, scoreBonus);
      const updated = { ...newState, lastSeenAt: nowISO() };
      storage.write(updated);
      setPet(updated);
      return message;
    },
    [pet]
  );

  // Called when the play mini-game ends — apply play action with score bonus
  const handlePlayComplete = useCallback(
    (score: number) => {
      handleAction('play', score);
      setScreen('main');
    },
    [handleAction]
  );

  // Called when the feed mini-game ends — apply feed action with score bonus
  const handleFeedComplete = useCallback(
    (score: number) => {
      handleAction('feed', score);
      setScreen('main');
    },
    [handleAction]
  );

  if (isOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  if (!pet) {
    return (
      <Box paddingX={2}>
        <Text color="red">No companion found. Something went wrong.</Text>
      </Box>
    );
  }

  const theme = getTheme(pet.theme);

  if (screen === 'stats') {
    return <StatsScreen pet={pet} theme={theme} onBack={() => setScreen('main')} />;
  }

  if (screen === 'play-game') {
    return (
      <PlayGameScreen
        petName={pet.name}
        theme={theme}
        onComplete={handlePlayComplete}
      />
    );
  }

  if (screen === 'feed-game') {
    return (
      <FeedGameScreen
        petName={pet.name}
        theme={theme}
        initialHunger={pet.stats.hunger}
        onComplete={handleFeedComplete}
      />
    );
  }

  return (
    <MainScreen
      pet={pet}
      theme={theme}
      onAction={(action, scoreBonus) => handleAction(action, scoreBonus)}
      onNavigate={(s: AppScreen) => setScreen(s)}
      initialEvent={initialEvent ?? null}
    />
  );
};
