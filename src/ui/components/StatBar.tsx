import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

interface StatBarProps {
  label: string;
  value: number; // 0–100
  color?: string;
  width?: number; // bar width in chars, default 20
}

export const StatBar: React.FC<StatBarProps> = ({ label, value, color = 'green', width = 20 }) => {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (value >= 20) return;
    const interval = setInterval(() => {
      setPulse((p) => !p);
    }, 600);
    return () => clearInterval(interval);
  }, [value]);

  const filled = Math.round((value / 100) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percentage = `${Math.round(value)}%`;

  // Color shifts: pulsing if < 20, red if < 25, yellow if < 50, otherwise provided color
  const isCritical = value < 20;

  return (
    <Box>
      <Box width={12}>
        <Text dimColor>{label.padEnd(11)}</Text>
      </Box>
      {isCritical ? (
        pulse ? (
          <Text color="red" bold>{bar}</Text>
        ) : (
          <Text dimColor>{bar}</Text>
        )
      ) : (
        <Text color={value < 25 ? 'red' : value < 50 ? 'yellow' : color}>{bar}</Text>
      )}
      <Box width={5} marginLeft={1}>
        <Text dimColor>{percentage.padStart(4)}</Text>
      </Box>
    </Box>
  );
};
