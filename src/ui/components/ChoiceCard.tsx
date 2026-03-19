import React from 'react';
import { Box, Text } from 'ink';

interface ChoiceCardProps {
  index: number;
  title: string;
  description: string;
  detail?: string;
  preview?: string[]; // ASCII art lines
  isSelected?: boolean;
  accentColor?: string;
}

export const ChoiceCard: React.FC<ChoiceCardProps> = ({
  index,
  title,
  description,
  detail,
  preview,
  isSelected = false,
  accentColor = 'cyan',
}) => {
  const borderColor = isSelected ? accentColor : 'gray';

  return (
    <Box
      borderStyle={isSelected ? 'bold' : 'single'}
      borderColor={borderColor}
      flexDirection="row"
      paddingX={1}
      marginBottom={1}
      gap={2}
    >
      {preview && (
        <Box flexDirection="column" width={14} alignItems="center" justifyContent="center">
          {preview.map((line, i) => (
            <Text key={i} color={isSelected ? accentColor : 'gray'}>
              {line}
            </Text>
          ))}
        </Box>
      )}
      <Box flexDirection="column" flexGrow={1}>
        <Box gap={1}>
          <Text color={accentColor} bold>
            [{index}]
          </Text>
          <Text bold color={isSelected ? accentColor : 'white'}>
            {title}
          </Text>
        </Box>
        <Text>{description}</Text>
        {detail && <Text dimColor>{detail}</Text>}
      </Box>
    </Box>
  );
};
