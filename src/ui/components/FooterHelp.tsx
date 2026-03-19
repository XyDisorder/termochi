import React from 'react';
import { Box, Text } from 'ink';

interface FooterHelpProps {
  hints: Array<{ key: string; label: string }>;
  borderColor?: string;
}

export const FooterHelp: React.FC<FooterHelpProps> = ({ hints, borderColor = 'gray' }) => (
  <Box borderStyle="single" borderColor={borderColor} paddingX={1} marginTop={1}>
    <Box gap={3} flexWrap="wrap">
      {hints.map(({ key, label }) => (
        <Box key={key} gap={1}>
          <Text color={borderColor} bold>
            [{key}]
          </Text>
          <Text dimColor>{label}</Text>
        </Box>
      ))}
    </Box>
  </Box>
);
