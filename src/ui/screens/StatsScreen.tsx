import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { PetState } from '../../domain/pet/pet.types.js';
import type { Theme } from '../../domain/theme/theme.types.js';
import { getMoodLabel, getMoodMessage } from '../../domain/pet/pet.logic.js';
import { formatAge } from '../../utils/formatters.js';
import { formatElapsedTime } from '../../infrastructure/clock/clock.js';
import { SPECIES_CATALOG } from '../../domain/species/species.catalog.js';
import { getEvolutionInfo } from '../../domain/pet/evolution.js';
import { StatBar } from '../components/StatBar.js';
import { Panel } from '../components/Panel.js';
import { PetAvatar } from '../components/PetAvatar.js';
import { FooterHelp } from '../components/FooterHelp.js';

interface StatsScreenProps {
  pet: PetState;
  onBack: () => void;
  theme: Theme;
}

const MOOD_EMOJI: Record<string, string> = {
  euphoric: '🤩',
  happy: '😊',
  calm: '😌',
  tired: '😴',
  hungry: '😋',
  grumpy: '😾',
  sick: '🤒',
};

export const StatsScreen: React.FC<StatsScreenProps> = ({ pet, onBack, theme }) => {
  useInput((input, key) => {
    if (input === 'q' || input === 'b' || key.escape) {
      onBack();
    }
  });

  const moodLabel = getMoodLabel(pet.stats);
  const moodMessage = getMoodMessage(pet.name, pet.stats);
  const moodEmoji = MOOD_EMOJI[moodLabel] ?? '😐';
  const age = formatAge(pet.createdAt);
  const lastSeen = formatElapsedTime(pet.lastSeenAt);
  const speciesInfo = SPECIES_CATALOG.find((s) => s.id === pet.species);
  const speciesName = speciesInfo?.name ?? pet.species;

  const gameModeLabel =
    pet.gameMode === 'cozy' ? 'Cozy' : pet.gameMode === 'normal' ? 'Normal' : 'Hardcore';
  const evo = getEvolutionInfo(pet.createdAt);

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Panel title={`${pet.name}'s Stats`} borderColor={theme.accent}>
        <Box flexDirection="row" gap={3} marginBottom={1}>
          {/* Avatar column */}
          <Box flexDirection="column" alignItems="center" justifyContent="flex-start" width={16}>
            <PetAvatar species={pet.species} color={theme.primary} animate={true} mood={moodLabel} />
            <Box marginTop={1}>
              <Text color={theme.accent} bold>
                {moodEmoji} {moodLabel}
              </Text>
            </Box>
          </Box>

          {/* Stats column */}
          <Box flexDirection="column" gap={0} flexGrow={1}>
            <Box marginBottom={1}>
              <Text dimColor>{moodMessage}</Text>
            </Box>

            <StatBar label="Hunger" value={pet.stats.hunger} color={theme.primary} />
            <StatBar label="Energy" value={pet.stats.energy} color={theme.primary} />
            <StatBar label="Mood" value={pet.stats.mood} color={theme.primary} />
            <StatBar label="Cleanliness" value={pet.stats.cleanliness} color={theme.primary} />
            <StatBar label="Health" value={pet.stats.health} color={theme.primary} />
          </Box>
        </Box>

        {/* Info row */}
        <Box
          borderStyle="single"
          borderColor={theme.border}
          paddingX={1}
          marginTop={1}
          flexDirection="column"
          gap={0}
        >
          <Box gap={3} flexWrap="wrap">
            <Box gap={1}>
              <Text dimColor>Age:</Text>
              <Text color={theme.accent}>{age}</Text>
            </Box>
            <Box gap={1}>
              <Text dimColor>Last seen:</Text>
              <Text color={theme.accent}>{lastSeen}</Text>
            </Box>
          </Box>
          <Box gap={3} flexWrap="wrap" marginTop={0}>
            <Box gap={1}>
              <Text dimColor>Species:</Text>
              <Text color={theme.primary}>{speciesName}</Text>
            </Box>
            <Box gap={1}>
              <Text dimColor>Mode:</Text>
              <Text color={theme.primary}>{gameModeLabel}</Text>
            </Box>
            <Box gap={1}>
              <Text dimColor>Theme:</Text>
              <Text color={theme.primary}>{theme.emoji} {theme.name}</Text>
            </Box>
          </Box>
          <Box gap={3} flexWrap="wrap" marginTop={0}>
            <Box gap={1}>
              <Text dimColor>Stage:</Text>
              <Text color={theme.accent}>{evo.badge} {evo.label} · day {evo.days}</Text>
            </Box>
            {evo.nextAt !== null && (
              <Box gap={1}>
                <Text dimColor>Next evolution:</Text>
                <Text color={theme.primary}>{evo.nextAt}d</Text>
              </Box>
            )}
          </Box>
          {(pet.deathCount ?? 0) > 0 && (
            <Box gap={1} marginTop={0}>
              <Text dimColor>Companions lost:</Text>
              <Text color="red">{'💀'.repeat(Math.min(pet.deathCount ?? 0, 10))} {pet.deathCount}</Text>
            </Box>
          )}
        </Box>
      </Panel>

      <FooterHelp
        hints={[
          { key: 'q', label: 'back' },
          { key: 'b', label: 'back' },
          { key: 'esc', label: 'back' },
        ]}
        borderColor={theme.border}
      />
    </Box>
  );
};
