import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { storage } from '../../infrastructure/storage/storage.js';
import { applyTimeDegradation, getMoodLabel, getMoodMessage } from '../../domain/pet/pet.logic.js';
import { getElapsedMinutes } from '../../infrastructure/clock/clock.js';
import { getTheme } from '../../domain/theme/theme.catalog.js';
import { SPECIES_CATALOG } from '../../domain/species/species.catalog.js';
import type { PetState, MoodLabel } from '../../domain/pet/pet.types.js';

const MOOD_EMOJI: Record<MoodLabel, string> = {
  euphoric: '🤩', happy: '😊', calm: '😌',
  tired: '😴', hungry: '😋', grumpy: '😾', sick: '🤒',
};

function loadCurrentPet(): PetState | null {
  const state = storage.read();
  if (!state) return null;
  const elapsed = getElapsedMinutes(state.lastSeenAt);
  return elapsed > 1 ? applyTimeDegradation(state, elapsed) : state;
}

function StatMini({ label, value, color }: { label: string; value: number; color: string }) {
  const filled = Math.round(value / 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
  const barColor = value < 25 ? 'red' : value < 50 ? 'yellow' : color;
  return (
    <Box gap={1}>
      <Text dimColor>{label}</Text>
      <Text color={barColor}>{bar}</Text>
      <Text dimColor>{String(Math.round(value)).padStart(3)}%</Text>
    </Box>
  );
}

interface WatchScreenProps {
  refreshInterval: number; // ms
}

export const WatchScreen: React.FC<WatchScreenProps> = ({ refreshInterval }) => {
  const { exit } = useApp();
  const [pet, setPet] = useState<PetState | null>(() => loadCurrentPet());
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setPet(loadCurrentPet());
      setLastRefresh(new Date());
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  useInput((input, key) => {
    if (input === 'q' || key.escape || (key.ctrl && input === 'c')) exit();
    if (input === 'r') {
      setPet(loadCurrentPet());
      setLastRefresh(new Date());
    }
  });

  if (!pet) {
    return (
      <Box borderStyle="round" borderColor="gray" paddingX={1} flexDirection="column">
        <Text dimColor>No companion yet.</Text>
        <Text dimColor>Run termochi to get started.</Text>
      </Box>
    );
  }

  const theme = getTheme(pet.theme);
  const mood = getMoodLabel(pet.stats);
  const moodEmoji = MOOD_EMOJI[mood];
  const species = SPECIES_CATALOG.find((s) => s.id === pet.species);
  const moodMsg = getMoodMessage(pet.name, pet.stats);
  const refreshStr = lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const minStat = Math.min(...Object.values(pet.stats));
  const alertColor = minStat < 20 ? 'red' : minStat < 40 ? 'yellow' : theme.primary;

  return (
    <Box
      borderStyle="round"
      borderColor={theme.border}
      flexDirection="column"
      paddingX={1}
      paddingY={0}
      width={32}
    >
      <Box justifyContent="space-between">
        <Box gap={1}>
          <Text color={theme.primary} bold>{pet.name}</Text>
          <Text dimColor>·</Text>
          <Text color={theme.accent}>{species?.name ?? pet.species}</Text>
        </Box>
        <Text color={alertColor}>{moodEmoji}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>{moodMsg}</Text>
      </Box>

      <StatMini label="🍖" value={pet.stats.hunger}      color={theme.primary} />
      <StatMini label="⚡" value={pet.stats.energy}      color={theme.primary} />
      <StatMini label="💭" value={pet.stats.mood}        color={theme.primary} />
      <StatMini label="✨" value={pet.stats.cleanliness} color={theme.primary} />
      <StatMini label="❤️" value={pet.stats.health}      color={theme.primary} />

      <Box marginTop={1} justifyContent="space-between">
        <Text dimColor>{pet.gameMode}</Text>
        <Text dimColor>{refreshStr}</Text>
      </Box>
      <Box>
        <Text dimColor>[r] refresh  [q] quit</Text>
      </Box>
    </Box>
  );
};
