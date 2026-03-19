import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { ThemeId } from '../../domain/pet/pet.types.js';
import { THEME_CATALOG } from '../../domain/theme/theme.catalog.js';
import { ChoiceCard } from '../components/ChoiceCard.js';
import { FooterHelp } from '../components/FooterHelp.js';
import { Panel } from '../components/Panel.js';

interface ThemePickerScreenProps {
  onSelect: (theme: ThemeId) => void;
  currentTheme?: ThemeId;
  accentColor?: string;
}

export const ThemePickerScreen: React.FC<ThemePickerScreenProps> = ({
  onSelect,
  currentTheme,
  accentColor = 'cyan',
}) => {
  const initialIndex = currentTheme
    ? Math.max(
        0,
        THEME_CATALOG.findIndex((t) => t.id === currentTheme)
      )
    : 0;
  const [selected, setSelected] = useState(initialIndex);

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setSelected((s) => (s - 1 + THEME_CATALOG.length) % THEME_CATALOG.length);
    } else if (key.downArrow || input === 'j') {
      setSelected((s) => (s + 1) % THEME_CATALOG.length);
    } else if (key.return || input === ' ') {
      const theme = THEME_CATALOG[selected];
      if (theme) onSelect(theme.id);
    } else {
      const num = parseInt(input, 10);
      if (num >= 1 && num <= THEME_CATALOG.length) {
        const theme = THEME_CATALOG[num - 1];
        if (theme) onSelect(theme.id);
      }
    }
  });

  return (
    <Box flexDirection="column" paddingX={2}>
      <Panel title="🎨 Choose Your Theme" borderColor={accentColor}>
        <Text dimColor>Pick a color palette for your companion's world.</Text>
        <Box marginTop={1} />
        {THEME_CATALOG.map((theme, i) => (
          <ChoiceCard
            key={theme.id}
            index={i + 1}
            title={theme.name}
            description={`Primary: ${theme.primary}  ·  Accent: ${theme.accent}`}
            detail={`${theme.emoji}  ${theme.name}`}
            preview={['████████', `  ${theme.emoji}  ${theme.name}  `]}
            isSelected={selected === i}
            accentColor={theme.primary}
          />
        ))}
      </Panel>
      <FooterHelp
        hints={[
          { key: '↑↓', label: 'navigate' },
          { key: '1-5', label: 'select' },
          { key: '↵', label: 'confirm' },
        ]}
        borderColor={accentColor}
      />
    </Box>
  );
};
