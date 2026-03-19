import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import type { MoodLabel, SpeciesId } from '../../domain/pet/pet.types.js';
import { getAsciiFrame, getMoodAvatarFrames, getMoodCategory } from '../ascii/species-ascii.js';

interface PetAvatarProps {
  species: SpeciesId;
  color?: string;
  animate?: boolean;
  mood?: MoodLabel;
}

export const PetAvatar: React.FC<PetAvatarProps> = ({
  species,
  color = 'white',
  animate = false,
  mood,
}) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!animate) return;
    const interval = setInterval(() => setFrame((f) => f + 1), 1500);
    return () => clearInterval(interval);
  }, [animate]);

  const frames = mood
    ? getMoodAvatarFrames(species, getMoodCategory(mood))
    : [getAsciiFrame(species, 0), getAsciiFrame(species, 1)];
  const lines = frames[frame % frames.length] ?? frames[0] ?? [];

  return (
    <Box flexDirection="column" alignItems="center">
      {lines.map((line, i) => (
        <Text key={i} color={color}>
          {line}
        </Text>
      ))}
    </Box>
  );
};
