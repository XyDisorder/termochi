import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text } from 'ink';
import type { PetState, PetAction } from '../domain/pet/pet.types.js';
import type { PetEvent } from '../domain/events/random-events.js';
import { applyAction, applyTimeDegradation, applyTaskStress } from '../domain/pet/pet.logic.js';
import type { TaskStressLevel } from '../domain/pet/pet.logic.js';
import { storage } from '../infrastructure/storage/storage.js';
import { integrationsConfigStorage } from '../infrastructure/storage/integrations-config.js';
import { fetchGitHubData } from '../infrastructure/integrations/github.js';
import { fetchTodayEvents } from '../infrastructure/integrations/calendar.js';
import type { CalendarEvent } from '../infrastructure/integrations/calendar.js';
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

export interface NextMeeting {
  title: string;
  startsInMin: number; // negative = already started
  url?: string;
}

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
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [nextMeeting, setNextMeeting] = useState<NextMeeting | null>(null);
  const [calendarConfigured, setCalendarConfigured] = useState(false);
  const [calendarWidgetVisible, setCalendarWidgetVisible] = useState(false);

  const handleOnboardingComplete = useCallback((newPet: PetState) => {
    storage.write(newPet);
    setPet(newPet);
    setIsOnboarding(false);
  }, []);

  // Fetch GitHub summary on mount + refresh every 5 minutes
  useEffect(() => {
    const cfg = integrationsConfigStorage.read();
    setGithubWidgetVisible(cfg.githubWidget ?? false);
    if (!cfg.github) return;
    setGithubConfigured(true);
    const token = cfg.github.token;
    function refresh(): void {
      fetchGitHubData(token)
        .then((data) => {
          setGithubSummary({
            mergedCount: data.mergedPRs.length,
            openCount: data.openPRs.length,
            staleCount: data.openPRs.filter((pr) => pr.openHours >= 48).length,
            reviewCount: data.reviewRequested.length,
          });
        })
        .catch(() => {});
    }
    refresh();
    const interval = setInterval(refresh, 5 * 60_000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch calendar events on mount + refresh every 5 minutes
  useEffect(() => {
    const cfg = integrationsConfigStorage.read();
    setCalendarWidgetVisible(cfg.calendarWidget ?? false);
    if (!cfg.calendar?.icsUrl) return;
    setCalendarConfigured(true);
    const icsUrl = cfg.calendar.icsUrl;
    function refresh(): void {
      fetchTodayEvents(icsUrl)
        .then((events) => setCalendarEvents(events))
        .catch(() => {});
    }
    refresh();
    const interval = setInterval(refresh, 5 * 60_000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Recompute next meeting every 30s
  useEffect(() => {
    function computeNext(): void {
      const now = new Date();
      const upcoming = calendarEvents.find((e) => {
        const min = (e.startAt.getTime() - now.getTime()) / 60_000;
        return min > -30 && min < 120; // started <30min ago or starting within 2h
      });
      if (!upcoming) { setNextMeeting(null); return; }
      const startsInMin = Math.round((upcoming.startAt.getTime() - now.getTime()) / 60_000);
      setNextMeeting({
        title: upcoming.title,
        startsInMin,
        ...(upcoming.meetingUrl ? { url: upcoming.meetingUrl } : {}),
      });
    }
    computeNext();
    const interval = setInterval(computeNext, 30_000);
    return () => clearInterval(interval);
  }, [calendarEvents]);

  const handleToggleCalendarWidget = useCallback(() => {
    setCalendarWidgetVisible((prev) => {
      const next = !prev;
      const cfg = integrationsConfigStorage.read();
      integrationsConfigStorage.write({ ...cfg, calendarWidget: next });
      return next;
    });
  }, []);

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
        {...(calendarConfigured ? { calendarEvents } : {})}
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
      calendarWidgetVisible={calendarWidgetVisible}
      {...(calendarConfigured ? { onToggleCalendarWidget: handleToggleCalendarWidget } : {})}
      {...(calendarConfigured ? { calendarEvents } : {})}
      {...(nextMeeting ? { nextMeeting } : {})}
    />
  );
};
