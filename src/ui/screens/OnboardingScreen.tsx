import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { GameMode, PetState, SpeciesId, ThemeId } from '../../domain/pet/pet.types.js';
import { createPet } from '../../domain/pet/pet.entity.js';
import { THEME_CATALOG } from '../../domain/theme/theme.catalog.js';
import { SPECIES_CATALOG } from '../../domain/species/species.catalog.js';
import { SpeciesPickerScreen } from './SpeciesPickerScreen.js';
import { GameModePickerScreen } from './GameModePickerScreen.js';
import { ThemePickerScreen } from './ThemePickerScreen.js';
import { PetAvatar } from '../components/PetAvatar.js';
import { Panel } from '../components/Panel.js';
import { FooterHelp } from '../components/FooterHelp.js';

type OnboardingStep = 'welcome' | 'name' | 'species' | 'gamemode' | 'theme' | 'confirm';

interface OnboardingScreenProps {
  onComplete: (pet: PetState) => void;
}

const WELCOME_LINES = [
  '  ╭────────────────────────────────╮  ',
  '  │                                │  ',
  '  │   Welcome to  T E R M O C H I  │  ',
  '  │                                │  ',
  '  │   A cozy terminal companion    │  ',
  '  │   who needs your care. 🌱      │  ',
  '  │                                │  ',
  '  ╰────────────────────────────────╯  ',
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<SpeciesId>('blob');
  const [gameMode, setGameMode] = useState<GameMode>('normal');
  const [theme, setTheme] = useState<ThemeId>('pastel');

  const currentThemeObj = THEME_CATALOG.find((t) => t.id === theme) ?? THEME_CATALOG[0]!;
  const accentColor = currentThemeObj.accent;
  const primaryColor = currentThemeObj.primary;

  // Welcome step
  useInput(
    (input, key) => {
      if (step === 'welcome') {
        setStep('name');
      } else if (step === 'name') {
        if (key.return) {
          if (name.trim().length > 0) {
            setStep('species');
          }
        } else if (key.backspace || key.delete) {
          setName((n) => n.slice(0, -1));
        } else if (input && input.length === 1 && !key.ctrl && !key.meta) {
          // Only printable characters
          const code = input.charCodeAt(0);
          if (code >= 32 && code < 127) {
            setName((n) => (n.length < 24 ? n + input : n));
          }
        }
      } else if (step === 'confirm') {
        if (key.return) {
          const pet = createPet({ name: name.trim(), species, gameMode, theme });
          onComplete(pet);
        }
      }
    },
    { isActive: step === 'welcome' || step === 'name' || step === 'confirm' }
  );

  if (step === 'welcome') {
    return (
      <Box flexDirection="column" alignItems="center" paddingY={2}>
        <Box flexDirection="column" alignItems="center">
          {WELCOME_LINES.map((line, i) => (
            <Text key={i} color={primaryColor}>
              {line}
            </Text>
          ))}
        </Box>
        <Box marginTop={2}>
          <Text dimColor>Press any key to begin...</Text>
        </Box>
      </Box>
    );
  }

  if (step === 'name') {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Panel title="🌟 Name Your Companion" borderColor={accentColor}>
          <Text dimColor>Give your companion a name they'll carry forever.</Text>
          <Box marginTop={2} marginBottom={1}>
            <Text>Name your companion: </Text>
            <Text color={accentColor}>{name}</Text>
            <Text color="gray">█</Text>
          </Box>
          {name.trim().length === 0 && (
            <Text dimColor color="yellow">
              Enter a name to continue.
            </Text>
          )}
        </Panel>
        <FooterHelp
          hints={[
            { key: 'type', label: 'enter name' },
            { key: '↵', label: 'continue' },
          ]}
          borderColor={accentColor}
        />
      </Box>
    );
  }

  if (step === 'species') {
    return (
      <SpeciesPickerScreen
        accentColor={accentColor}
        onSelect={(s) => {
          setSpecies(s);
          setStep('gamemode');
        }}
      />
    );
  }

  if (step === 'gamemode') {
    return (
      <GameModePickerScreen
        accentColor={accentColor}
        onSelect={(m) => {
          setGameMode(m);
          setStep('theme');
        }}
      />
    );
  }

  if (step === 'theme') {
    return (
      <ThemePickerScreen
        currentTheme={theme}
        accentColor={accentColor}
        onSelect={(t) => {
          setTheme(t);
          setStep('confirm');
        }}
      />
    );
  }

  // Confirmation step
  const speciesInfo = SPECIES_CATALOG.find((s) => s.id === species);
  const gameModeLabel =
    gameMode === 'cozy' ? 'Cozy' : gameMode === 'normal' ? 'Normal' : 'Hardcore';
  const themeInfo = THEME_CATALOG.find((t) => t.id === theme);
  const confirmAccent = themeInfo?.accent ?? 'cyan';
  const confirmPrimary = themeInfo?.primary ?? 'white';

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Panel title="✨ Your Companion is Ready!" borderColor={confirmAccent}>
        <Box flexDirection="row" gap={4} marginTop={1}>
          <Box flexDirection="column" alignItems="center" justifyContent="center">
            <PetAvatar species={species} color={confirmPrimary} animate={false} />
          </Box>
          <Box flexDirection="column" gap={1}>
            <Box gap={2}>
              <Text dimColor>Name:</Text>
              <Text color={confirmAccent} bold>
                {name.trim()}
              </Text>
            </Box>
            <Box gap={2}>
              <Text dimColor>Species:</Text>
              <Text color={confirmPrimary} bold>
                {speciesInfo?.name ?? species}
              </Text>
            </Box>
            <Box gap={2}>
              <Text dimColor>Mode:</Text>
              <Text color={confirmPrimary} bold>
                {gameModeLabel}
              </Text>
            </Box>
            <Box gap={2}>
              <Text dimColor>Theme:</Text>
              <Text color={confirmPrimary} bold>
                {themeInfo?.emoji} {themeInfo?.name ?? theme}
              </Text>
            </Box>
            {speciesInfo && (
              <Box marginTop={1}>
                <Text dimColor>{speciesInfo.description}</Text>
              </Box>
            )}
          </Box>
        </Box>
        <Box marginTop={2} justifyContent="center">
          <Text color={confirmAccent} bold>
            Press Enter to begin your journey! 🌱
          </Text>
        </Box>
      </Panel>
      <FooterHelp
        hints={[{ key: '↵', label: 'start journey' }]}
        borderColor={confirmAccent}
      />
    </Box>
  );
};
