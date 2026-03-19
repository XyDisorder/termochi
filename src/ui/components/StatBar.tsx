import React from 'react';
import { Box, Text } from 'ink';

interface StatBarProps {
  label: string;
  value: number; // 0–100
  color?: string;
  width?: number; // bar width in chars, default 20
}

export const StatBar: React.FC<StatBarProps> = ({ label, value, color = 'green', width = 20 }) => {
  const filled = Math.round((value / 100) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percentage = `${Math.round(value)}%`;

  // Color shifts: red if < 25, yellow if < 50, otherwise provided color
  const barColor = value < 25 ? 'red' : value < 50 ? 'yellow' : color;

  return (
    <Box>
      <Box width={12}>
        <Text dimColor>{label.padEnd(11)}</Text>
      </Box>
      <Text color={barColor}>{bar}</Text>
      <Box width={5} marginLeft={1}>
        <Text dimColor>{percentage.padStart(4)}</Text>
      </Box>
    </Box>
  );
};
