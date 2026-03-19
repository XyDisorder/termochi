import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { SpeciesId } from '../../domain/pet/pet.types.js';
import { SPECIES_CATALOG } from '../../domain/species/species.catalog.js';
import { SPECIES_PREVIEW } from '../ascii/species-ascii.js';
import { ChoiceCard } from '../components/ChoiceCard.js';
import { FooterHelp } from '../components/FooterHelp.js';
import { Panel } from '../components/Panel.js';

interface SpeciesPickerScreenProps {
  onSelect: (species: SpeciesId) => void;
  accentColor?: string;
}

export const SpeciesPickerScreen: React.FC<SpeciesPickerScreenProps> = ({
  onSelect,
  accentColor = 'cyan',
}) => {
  const [selected, setSelected] = useState(0);

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setSelected((s) => (s - 1 + SPECIES_CATALOG.length) % SPECIES_CATALOG.length);
    } else if (key.downArrow || input === 'j') {
      setSelected((s) => (s + 1) % SPECIES_CATALOG.length);
    } else if (key.return || input === ' ') {
      const species = SPECIES_CATALOG[selected];
      if (species) onSelect(species.id);
    } else {
      const num = parseInt(input, 10);
      if (num >= 1 && num <= SPECIES_CATALOG.length) {
        const species = SPECIES_CATALOG[num - 1];
        if (species) onSelect(species.id);
      }
    }
  });

  return (
    <Box flexDirection="column" paddingX={2}>
      <Panel title="✨ Choose Your Companion" borderColor={accentColor}>
        <Text dimColor>Who will you adopt today?</Text>
        <Box marginTop={1} />
        {SPECIES_CATALOG.map((species, i) => (
          <ChoiceCard
            key={species.id}
            index={i + 1}
            title={species.name}
            description={species.description}
            detail={`Tendency: ${species.tendency}`}
            preview={SPECIES_PREVIEW[species.id]}
            isSelected={selected === i}
            accentColor={accentColor}
          />
        ))}
      </Panel>
      <FooterHelp
        hints={[
          { key: '↑↓', label: 'navigate' },
          { key: '1-4', label: 'select' },
          { key: '↵', label: 'confirm' },
        ]}
        borderColor={accentColor}
      />
    </Box>
  );
};
