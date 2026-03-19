import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { GameMode } from '../../domain/pet/pet.types.js';
import { GAME_MODE_CONFIGS } from '../../domain/game/game-mode.logic.js';
import { ChoiceCard } from '../components/ChoiceCard.js';
import { FooterHelp } from '../components/FooterHelp.js';
import { Panel } from '../components/Panel.js';

interface GameModePickerScreenProps {
  onSelect: (mode: GameMode) => void;
  accentColor?: string;
}

export const GameModePickerScreen: React.FC<GameModePickerScreenProps> = ({
  onSelect,
  accentColor = 'cyan',
}) => {
  const [selected, setSelected] = useState(0);

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setSelected((s) => (s - 1 + GAME_MODE_CONFIGS.length) % GAME_MODE_CONFIGS.length);
    } else if (key.downArrow || input === 'j') {
      setSelected((s) => (s + 1) % GAME_MODE_CONFIGS.length);
    } else if (key.return || input === ' ') {
      const config = GAME_MODE_CONFIGS[selected];
      if (config) onSelect(config.id);
    } else {
      const num = parseInt(input, 10);
      if (num >= 1 && num <= GAME_MODE_CONFIGS.length) {
        const config = GAME_MODE_CONFIGS[num - 1];
        if (config) onSelect(config.id);
      }
    }
  });

  return (
    <Box flexDirection="column" paddingX={2}>
      <Panel title="🎮 Choose Your Game Mode" borderColor={accentColor}>
        <Text dimColor>How demanding should your companion be?</Text>
        <Box marginTop={1} />
        {GAME_MODE_CONFIGS.map((config, i) => (
          <ChoiceCard
            key={config.id}
            index={i + 1}
            title={config.name}
            description={config.description}
            detail={`Example: ${config.example}`}
            isSelected={selected === i}
            accentColor={accentColor}
          />
        ))}
      </Panel>
      <FooterHelp
        hints={[
          { key: '↑↓', label: 'navigate' },
          { key: '1-3', label: 'select' },
          { key: '↵', label: 'confirm' },
        ]}
        borderColor={accentColor}
      />
    </Box>
  );
};
