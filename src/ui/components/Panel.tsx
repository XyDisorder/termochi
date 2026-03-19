import React from 'react';
import { Box, Text } from 'ink';

interface PanelProps {
  title?: string;
  borderColor?: string;
  width?: number;
  children: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({ title, borderColor = 'gray', width, children }) => (
  <Box
    borderStyle="round"
    borderColor={borderColor}
    flexDirection="column"
    paddingX={1}
    width={width}
  >
    {title && (
      <Box marginBottom={1}>
        <Text color={borderColor} bold>
          {title}
        </Text>
      </Box>
    )}
    {children}
  </Box>
);
