import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { spawn } from 'node:child_process';
import type { GitHubWidgetData, NextMeeting } from '../../app/App.js';
import type { CalendarEvent } from '../../infrastructure/integrations/calendar.js';
import type { ActionCheck, PetAction, PetState, PetStats } from '../../domain/pet/pet.types.js';
import type { Theme } from '../../domain/theme/theme.types.js';
import type { PetEvent } from '../../domain/events/random-events.js';
import { canPerformAction, getMoodLabel, getMoodMessage } from '../../domain/pet/pet.logic.js';
import { formatAge } from '../../utils/formatters.js';
import { formatElapsedTime } from '../../infrastructure/clock/clock.js';
import { SPECIES_CATALOG } from '../../domain/species/species.catalog.js';
import { getEvolutionInfo } from '../../domain/pet/evolution.js';
import { lerp } from '../../utils/math.js';
import { StatBar } from '../components/StatBar.js';
import { PetAvatar } from '../components/PetAvatar.js';
import { FooterHelp } from '../components/FooterHelp.js';

interface MainScreenProps {
  pet: PetState;
  theme: Theme;
  onAction: (action: PetAction, scoreBonus?: number) => string;
  onNavigate: (screen: 'stats' | 'play-game' | 'feed-game' | 'settings' | 'tasks' | 'ai-chat') => void;
  onRescue?: () => void;
  initialEvent?: PetEvent | null;
  githubSummary?: GitHubWidgetData | null;
  githubWidgetVisible?: boolean;
  calendarWidgetVisible?: boolean;
  calendarEvents?: CalendarEvent[];
  nextMeeting?: NextMeeting;
}

const ACTION_LABELS: Record<PetAction, string> = {
  feed: 'Fed',
  play: 'Played',
  sleep: 'Rested',
  clean: 'Cleaned',
  heal: 'Healed',
  talk: 'Talked',
};

const MOOD_EMOJI: Record<string, string> = {
  euphoric: '🤩',
  happy: '😊',
  calm: '😌',
  tired: '😴',
  hungry: '😋',
  grumpy: '😾',
  sick: '🤒',
};

// Footer action hint with live availability status
const FOOTER_ACTIONS: Array<{ key: string; action: PetAction; label: string }> = [
  { key: 'f', action: 'feed',  label: 'Feed'  },
  { key: 'p', action: 'play',  label: 'Play'  },
  { key: 's', action: 'sleep', label: 'Sleep' },
  { key: 'c', action: 'clean', label: 'Clean' },
  { key: 'h', action: 'heal',  label: 'Heal'  },
];

const PetMenuFooter: React.FC<{ pet: PetState; theme: Theme }> = ({ pet, theme }) => (
  <Box borderStyle="single" borderColor={pet.stats.health < 20 ? 'red' : theme.accent} paddingX={1} marginTop={1} flexWrap="wrap" gap={2}>
    {FOOTER_ACTIONS.map(({ key, action, label }) => {
      const check: ActionCheck = canPerformAction(pet, action);
      if (check.allowed) {
        return (
          <Box key={action} gap={1}>
            <Text color={theme.accent} bold>[{key}]</Text>
            <Text>{label}</Text>
          </Box>
        );
      }
      const sub = check.reason === 'cooldown' ? `${check.remainingMinutes}m` : check.message;
      return (
        <Box key={action} gap={1}>
          <Text dimColor>[{key}]</Text>
          <Text dimColor>{label}</Text>
          <Text dimColor>({sub})</Text>
        </Box>
      );
    })}
    {pet.stats.health < 20 && (
      <Box gap={1}>
        <Text color="red" bold>[r]</Text>
        <Text color="red" bold>Rescue!</Text>
      </Box>
    )}
    <Box gap={1}>
      <Text color={theme.border} bold>[esc]</Text>
      <Text>back</Text>
    </Box>
  </Box>
);

const MainFooter: React.FC<{
  theme: Theme;
  hasMeetingUrl?: boolean;
}> = ({ theme, hasMeetingUrl }) => (
  <Box borderStyle="single" borderColor={theme.border} paddingX={1} marginTop={1} flexWrap="wrap" gap={2}>
    <Box gap={1}>
      <Text color={theme.border} bold>[m]</Text>
      <Text>Pet</Text>
    </Box>
    <Box gap={1}>
      <Text color={theme.border} bold>[a]</Text>
      <Text>Chat</Text>
    </Box>
    <Box gap={1}>
      <Text color={theme.border} bold>[t]</Text>
      <Text>Tasks</Text>
    </Box>
    {hasMeetingUrl && (
      <Box gap={1}>
        <Text color={theme.border} bold>[↵]</Text>
        <Text>join meeting</Text>
      </Box>
    )}
    <Box gap={1}>
      <Text color={theme.border} bold>[i]</Text>
      <Text>Stats</Text>
    </Box>
    <Box gap={1}>
      <Text color={theme.border} bold>[,]</Text>
      <Text>Settings</Text>
    </Box>
    <Box gap={1}>
      <Text color={theme.border} bold>[q]</Text>
      <Text>Quit</Text>
    </Box>
  </Box>
);

// Per-action animation frames: each frame shows for ~600ms
// 5 frames × 600ms = 3 seconds total before stats are applied
const ACTION_ANIM_FRAMES: Record<PetAction, Array<{ art: string; text: string }>> = {
  feed: [
    { art: '(⊙_⊙)', text: 'Oh, a snack??' },
    { art: '(≧∇≦)/', text: 'Getting the snacks...' },
    { art: '(o^^)o', text: 'Nom nom nom...' },
    { art: '(´〜｀)♡', text: 'Savoring every bite...' },
    { art: '(≧◡≦) ✨', text: 'Delicious!' },
  ],
  play: [
    { art: 'ヽ(^o^)ノ', text: "Let's go!!" },
    { art: '\\(^ω^)/', text: 'Zoom zoom!' },
    { art: '(≧ω≦) ★', text: 'So much energy!' },
    { art: '(◡‿◡✿)', text: 'The best day ever!' },
    { art: '(＾▽＾) ♪', text: 'Hehe...' },
  ],
  sleep: [
    { art: '(-.-)  ...', text: 'Getting cozy...' },
    { art: '(- -)  Zzz', text: 'Drifting off...' },
    { art: '(＿＿) Zzz', text: 'Dreaming...' },
    { art: "(´∀｀) 💤", text: 'Sweet dreams...' },
    { art: '(ᴗ_ᴗ)  💤', text: 'Shhh...' },
  ],
  clean: [
    { art: '(ﾉ◕ヮ◕)ﾉ', text: 'Bath time!' },
    { art: '(*ﾟ▽ﾟ*)~', text: 'Splash splash!' },
    { art: '(ﾉ^o^)ﾉ ✨', text: 'Scrub scrub...' },
    { art: '✨(*^▽^*)✨', text: 'Sparkling clean!' },
    { art: '(≧◡≦) ✨', text: 'Feeling fresh!' },
  ],
  heal: [
    { art: '(╥_╥)', text: 'Medicine time...' },
    { art: '(;一_一) 💊', text: 'This tastes bad...' },
    { art: '(¬_¬) ...', text: 'Okay fine...' },
    { art: '(￣▽￣)b', text: 'Starting to feel better!' },
    { art: '(^_^) ♥', text: 'On the mend!' },
  ],
  talk: [
    { art: '(・◡・) ?', text: "I'm listening..." },
    { art: "(´• ω •`)", text: 'Hmm hmm...' },
    { art: '(◠‿◠) ♪', text: 'Chirp chirp!' },
    { art: '(｡◕‿◕｡)', text: 'Feeling heard!' },
    { art: '(≧◡≦) 💙', text: 'You get me!' },
  ],
};

// Duration in ms for each animation frame
const FRAME_DURATION = 600;
// Total frames per action
const TOTAL_FRAMES = 5;
// Duration in ms for stat bar animation after action
const STAT_ANIM_DURATION = 900;
const STAT_ANIM_STEPS = 30;

export const MainScreen: React.FC<MainScreenProps> = ({ pet, theme, onAction, onNavigate, onRescue, initialEvent, githubSummary, githubWidgetVisible, calendarWidgetVisible, calendarEvents, nextMeeting }) => {
  const { exit } = useApp();
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentAction, setCurrentAction] = useState<PetAction | null>(null);
  const [animFrame, setAnimFrame] = useState(0);
  const [petMenuOpen, setPetMenuOpen] = useState(false);

  // displayStats are what the bars actually show — they animate smoothly
  const [displayStats, setDisplayStats] = useState<PetStats>(pet.stats);
  const prevStatsRef = useRef<PetStats>(pet.stats);

  // Animate stat bars whenever pet.stats changes (after an action is applied)
  useEffect(() => {
    const from = prevStatsRef.current;
    const to = pet.stats;
    prevStatsRef.current = to;

    // Skip animation on initial mount (stats are identical)
    const isSame = (Object.keys(to) as Array<keyof PetStats>).every(
      (k) => Math.round(from[k]) === Math.round(to[k])
    );
    if (isSame) return;

    let step = 0;
    const interval = setInterval(() => {
      step++;
      const t = Math.min(step / STAT_ANIM_STEPS, 1);
      // Ease-out: t² gives a nice deceleration
      const eased = 1 - (1 - t) * (1 - t);
      setDisplayStats({
        hunger: Math.round(lerp(from.hunger, to.hunger, eased)),
        energy: Math.round(lerp(from.energy, to.energy, eased)),
        mood: Math.round(lerp(from.mood, to.mood, eased)),
        cleanliness: Math.round(lerp(from.cleanliness, to.cleanliness, eased)),
        health: Math.round(lerp(from.health, to.health, eased)),
      });
      if (step >= STAT_ANIM_STEPS) {
        setDisplayStats(to);
        clearInterval(interval);
      }
    }, STAT_ANIM_DURATION / STAT_ANIM_STEPS);

    return () => clearInterval(interval);
  }, [pet.stats]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cycle animation frames while an action is animating
  useEffect(() => {
    if (!isAnimating) return;
    setAnimFrame(0);
    const interval = setInterval(() => {
      setAnimFrame((f) => f + 1);
    }, FRAME_DURATION);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Show random event flash on mount
  useEffect(() => {
    if (!initialEvent) return;
    setFlashMessage(`${initialEvent.emoji} ${initialEvent.title} — ${initialEvent.description}`);
    const t = setTimeout(() => setFlashMessage(null), 5000);
    return () => clearTimeout(t);
  }, []); // only on mount

  const triggerAction = useCallback(
    (action: PetAction) => {
      if (isAnimating) return;

      const check = canPerformAction(pet, action);

      if (!check.allowed) {
        // Show refusal message briefly, no animation
        const msg =
          check.reason === 'cooldown'
            ? `Not yet — wait ${check.remainingMinutes}m`
            : `Can't do that — ${check.message}`;
        setFlashMessage(msg);
        setTimeout(() => setFlashMessage(null), 2000);
        return;
      }

      setIsAnimating(true);
      setCurrentAction(action);
      setFlashMessage(null);

      // After all frames play out, apply the actual stat change
      setTimeout(() => {
        const msg = onAction(action);
        setIsAnimating(false);
        setCurrentAction(null);
        setFlashMessage(msg || ACTION_LABELS[action]);
        process.stdout.write('\x07');
        setTimeout(() => setFlashMessage(null), 2500);
      }, FRAME_DURATION * TOTAL_FRAMES);
    },
    [isAnimating, onAction, pet]
  );

  useInput((input, key) => {
    if (isAnimating) return;

    if (petMenuOpen) {
      if (input === 'f') {
        const check = canPerformAction(pet, 'feed');
        if (!check.allowed) {
          const msg = check.reason === 'cooldown' ? `Not yet — wait ${check.remainingMinutes}m` : `Can't feed — ${check.message}`;
          setFlashMessage(msg);
          setTimeout(() => setFlashMessage(null), 2000);
        } else {
          onNavigate('feed-game');
        }
      }
      else if (input === 'p') {
        const check = canPerformAction(pet, 'play');
        if (!check.allowed) {
          const msg = check.reason === 'cooldown' ? `Not yet — wait ${check.remainingMinutes}m` : `Can't play — ${check.message}`;
          setFlashMessage(msg);
          setTimeout(() => setFlashMessage(null), 2000);
        } else {
          onNavigate('play-game');
        }
      }
      else if (input === 's') triggerAction('sleep');
      else if (input === 'c') triggerAction('clean');
      else if (input === 'h') triggerAction('heal');
      else if (input === 'r' && onRescue && pet.stats.health < 20) onRescue();
      else if (key.escape || input === 'm') setPetMenuOpen(false);
      return;
    }

    if (input === 'm') setPetMenuOpen(true);
    else if (input === 'a') onNavigate('ai-chat');
    else if (input === 't') onNavigate('tasks');
    else if (key.return && nextMeeting?.url) spawn('open', [nextMeeting.url], { detached: true, stdio: 'ignore' }).unref();
    else if (input === 'i') onNavigate('stats');
    else if (input === ',') onNavigate('settings');
    else if (input === 'q' || key.escape) exit();
  });

  const moodLabel = getMoodLabel(pet.stats);
  const moodMessage = getMoodMessage(pet.name, pet.stats);
  const moodEmoji = MOOD_EMOJI[moodLabel] ?? '😐';
  const age = formatAge(pet.createdAt);
  const lastSeen = formatElapsedTime(pet.lastSeenAt);
  const speciesInfo = SPECIES_CATALOG.find((s) => s.id === pet.species);
  const speciesName = speciesInfo?.name ?? pet.species;
  const evo = getEvolutionInfo(pet.createdAt);

  // Current animation frame content
  const frames = currentAction ? ACTION_ANIM_FRAMES[currentAction] : null;
  const currentFrame = frames
    ? frames[animFrame % frames.length] ?? frames[0]
    : null;

  return (
    <Box flexDirection="column" paddingX={1} paddingY={0}>
      <Box
        borderStyle="round"
        borderColor={theme.border}
        flexDirection="column"
        paddingX={2}
        paddingY={1}
      >
        {/* Header */}
        <Box gap={2} marginBottom={1} alignItems="center">
          <Text color={theme.primary} bold>
            Termochi
          </Text>
          <Text dimColor>·</Text>
          <Text color={theme.accent} bold>
            {pet.name}
          </Text>
          <Text dimColor>·</Text>
          <Text color={theme.primary}>{speciesName}</Text>
          <Text dimColor>·</Text>
          <Text color={theme.accent}>
            {moodEmoji} {moodLabel}
          </Text>
          <Text dimColor>·</Text>
          <Text color={theme.primary}>{evo.badge} {evo.label}</Text>
        </Box>

        {/* Avatar + stats */}
        <Box flexDirection="row" gap={4}>
          {/* Left: avatar or action animation */}
          <Box flexDirection="column" alignItems="center" width={18}>
            {isAnimating && currentFrame ? (
              <>
                <Box
                  height={4}
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text color={theme.accent} bold>
                    {currentFrame.art}
                  </Text>
                </Box>
                <Box marginTop={1} flexDirection="column" alignItems="center">
                  <Text color={theme.primary}>{currentFrame.text}</Text>
                </Box>
              </>
            ) : (
              <>
                <PetAvatar species={pet.species} color={theme.primary} animate={!isAnimating} mood={moodLabel} />
                <Box marginTop={1} flexDirection="column" alignItems="center">
                  {flashMessage ? (
                    <Text color={theme.accent} bold>
                      ✨ {flashMessage}
                    </Text>
                  ) : (
                    <Text dimColor>{moodEmoji}</Text>
                  )}
                </Box>
              </>
            )}
          </Box>

          {/* Right: stat bars (always use displayStats for smooth animation) */}
          <Box flexDirection="column" flexGrow={1} justifyContent="center">
            <StatBar label="Hunger" value={displayStats.hunger} color={theme.primary} />
            <StatBar label="Energy" value={displayStats.energy} color={theme.primary} />
            <StatBar label="Mood" value={displayStats.mood} color={theme.primary} />
            <StatBar label="Cleanliness" value={displayStats.cleanliness} color={theme.primary} />
            <StatBar label="Health" value={displayStats.health} color={theme.primary} />
          </Box>
        </Box>

        {/* Mood message / critical warning */}
        <Box marginTop={1}>
          {pet.stats.health < 20 && !isAnimating ? (
            <Text color="red" bold>💀 Critical! Press [m] then [r] to attempt rescue!</Text>
          ) : (
            <Text dimColor>
              {isAnimating && currentFrame ? currentFrame.text : moodMessage}
            </Text>
          )}
        </Box>

        {/* Footer info */}
        <Box marginTop={1} gap={3} flexWrap="wrap">
          <Box gap={1}>
            <Text dimColor>Age:</Text>
            <Text color={theme.accent}>{age}</Text>
          </Box>
          <Text dimColor>·</Text>
          <Box gap={1}>
            <Text dimColor>Last seen:</Text>
            <Text color={theme.accent}>{lastSeen}</Text>
          </Box>
        </Box>

        {/* Calendar widget */}
        {calendarWidgetVisible && (
          <Box marginTop={1} gap={2}>
            <Text dimColor>📅</Text>
            {nextMeeting ? (
              <>
                <Text color={nextMeeting.startsInMin <= 0 ? 'red' : nextMeeting.startsInMin <= 10 ? 'yellow' : theme.primary} bold={nextMeeting.startsInMin <= 10}>
                  {nextMeeting.title}
                </Text>
                <Text color={nextMeeting.startsInMin <= 0 ? 'red' : nextMeeting.startsInMin <= 10 ? 'yellow' : theme.accent}>
                  {nextMeeting.startsInMin <= 0 ? '— NOW' : `in ${nextMeeting.startsInMin}min`}
                </Text>
                {nextMeeting.url && (
                  <Text color={theme.accent}>
                    {`\x1b]8;;${nextMeeting.url}\x07↗ join\x1b]8;;\x07`}
                  </Text>
                )}
              </>
            ) : calendarEvents && calendarEvents.length > 0 ? (
              <Text dimColor>{calendarEvents.length} meeting{calendarEvents.length > 1 ? 's' : ''} today — none soon</Text>
            ) : (
              <Text dimColor>No meetings today</Text>
            )}
          </Box>
        )}

        {/* GitHub compact widget */}
        {githubWidgetVisible && githubSummary && (
          <Box marginTop={1} gap={2} flexWrap="wrap">
            <Text dimColor>GH</Text>
            <Text color="green">✓ {githubSummary.mergedCount} merged</Text>
            <Text color={theme.primary}>● {githubSummary.openCount} open</Text>
            {githubSummary.reviewCount > 0 && (
              <Text color={theme.accent}>⊙ {githubSummary.reviewCount} review</Text>
            )}
            {githubSummary.staleCount > 0 && (
              <Text color="red">⚠ {githubSummary.staleCount} stuck</Text>
            )}
          </Box>
        )}
      </Box>

      {isAnimating ? (
        <FooterHelp hints={[{ key: '...', label: 'animating' }]} borderColor={theme.border} />
      ) : petMenuOpen ? (
        <PetMenuFooter pet={pet} theme={theme} />
      ) : (
        <MainFooter theme={theme} hasMeetingUrl={!!(calendarWidgetVisible && nextMeeting?.url)} />
      )}
    </Box>
  );
};
