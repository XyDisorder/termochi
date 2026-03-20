import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text } from 'ink';
import type { PetState, PetAction } from '../domain/pet/pet.types.js';
import type { PetEvent } from '../domain/events/random-events.js';
import { applyAction, applyTimeDegradation, applyTaskStress } from '../domain/pet/pet.logic.js';
import type { TaskStressLevel } from '../domain/pet/pet.logic.js';
import { storage } from '../infrastructure/storage/storage.js';
import { integrationsConfigStorage } from '../infrastructure/storage/integrations-config.js';
import { fetchGitHubData } from '../infrastructure/integrations/github.js';
import { getTheme } from '../domain/theme/theme.catalog.js';
import { getElapsedMinutes, nowISO } from '../infrastructure/clock/clock.js';
import { OnboardingScreen } from '../ui/screens/OnboardingScreen.js';
import { MainScreen } from '../ui/screens/MainScreen.js';
import { StatsScreen } from '../ui/screens/StatsScreen.js';
import { PlayGameScreen } from '../ui/screens/PlayGameScreen.js';
import { FeedGameScreen } from '../ui/screens/FeedGameScreen.js';
import { SettingsScreen } from '../ui/screens/SettingsScreen.js';
import { TasksScreen } from '../ui/screens/TasksScreen.js';
import { AiChatScreen } from '../ui/screens/AiChatScreen.js';

export interface GitHubWidgetData {
  mergedCount: number;
  openCount: number;
  staleCount: number;
  reviewCount: number;
}

export type AppScreen =
  | 'main'
  | 'stats'
  | 'play-game'
  | 'feed-game'
  | 'settings'
  | 'tasks'
  | 'ai-chat';

interface AppProps {
  initialPet: PetState | null;
  initialEvent?: PetEvent | null;
}

export const App: React.FC<AppProps> = ({ initialPet, initialEvent }) => {
  const [pet, setPet] = useState<PetState | null>(initialPet);
  const [screen, setScreen] = useState<AppScreen>('main');
  const [isOnboarding, setIsOnboarding] = useState(initialPet === null);
  const [settingsReturnScreen, setSettingsReturnScreen] = useState<AppScreen>('main');
  const [githubSummary, setGithubSummary] = useState<GitHubWidgetData | null>(null);
  const [githubWidgetVisible, setGithubWidgetVisible] = useState(false);
  const [githubConfigured, setGithubConfigured] = useState(false);

  const handleOnboardingComplete = useCallback((newPet: PetState) => {
    storage.write(newPet);
    setPet(newPet);
    setIsOnboarding(false);
  }, []);

  // Fetch GitHub summary silently on mount
  useEffect(() => {
    const cfg = integrationsConfigStorage.read();
    setGithubWidgetVisible(cfg.githubWidget ?? false);
    if (!cfg.github) return;
    setGithubConfigured(true);
    fetchGitHubData(cfg.github.token)
      .then((data) => {
        setGithubSummary({
          mergedCount: data.mergedPRs.length,
          openCount: data.openPRs.length,
          staleCount: data.openPRs.filter((pr) => pr.openHours >= 48).length,
          reviewCount: data.reviewRequested.length,
        });
      })
      .catch(() => {}); // silent
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleGitHubWidget = useCallback(() => {
    setGithubWidgetVisible((prev) => {
      const next = !prev;
      const cfg = integrationsConfigStorage.read();
      integrationsConfigStorage.write({ ...cfg, githubWidget: next });
      return next;
    });
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

  // Live degradation — recalcule les stats toutes les 30 secondes pendant que l'app tourne
  useEffect(() => {
    const interval = setInterval(() => {
      setPet((prev) => {
        if (!prev) return prev;
        const elapsed = getElapsedMinutes(prev.lastSeenAt);
        if (elapsed < 0.1) return prev; // moins de 6 secondes, on skip
        const degraded = applyTimeDegradation(prev, elapsed);
        const updated = { ...degraded, lastSeenAt: nowISO() };
        storage.write(updated);
        return updated;
      });
    }, 30_000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlayComplete = useCallback(
    (score: number) => {
      handleAction('play', score);
      setScreen('main');
    },
    [handleAction]
  );

  const handleFeedComplete = useCallback(
    (score: number) => {
      handleAction('feed', score);
      setScreen('main');
    },
    [handleAction]
  );

  const handleTaskStress = useCallback(
    (level: TaskStressLevel) => {
      setPet((prev) => {
        if (!prev || level === 'none') return prev;
        const updated = applyTaskStress(prev, level);
        storage.write(updated);
        return updated;
      });
    },
    []
  );

  // Called when AI chat ends — apply talk action if user had a conversation
  const handleAiChatBack = useCallback(
    (hadConversation: boolean) => {
      if (hadConversation) handleAction('talk');
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

  if (screen === 'settings') {
    return (
      <SettingsScreen
        theme={theme}
        onBack={() => setScreen(settingsReturnScreen)}
      />
    );
  }

  if (screen === 'tasks') {
    return (
      <TasksScreen
        theme={theme}
        onBack={() => setScreen('main')}
        onOpenSettings={() => {
          setSettingsReturnScreen('tasks');
          setScreen('settings');
        }}
        onStress={handleTaskStress}
      />
    );
  }

  if (screen === 'ai-chat') {
    return (
      <AiChatScreen
        pet={pet}
        theme={theme}
        onBack={handleAiChatBack}
        onOpenSettings={() => {
          setSettingsReturnScreen('ai-chat');
          setScreen('settings');
        }}
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
      githubSummary={githubSummary}
      githubWidgetVisible={githubWidgetVisible}
      {...(githubConfigured ? { onToggleGithubWidget: handleToggleGitHubWidget } : {})}
    />
  );
};
