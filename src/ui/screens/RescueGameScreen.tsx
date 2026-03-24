import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Theme } from '../../domain/theme/theme.types.js';

interface RescueGameScreenProps {
  petName: string;
  theme: Theme;
  onWin: () => void;
  onLose: () => void;
}

const TRACK_WIDTH = 38;
const ZONE_WIDTH = 6;
const HITS_TO_WIN = 7;
const INITIAL_LIVES = 3;
const INITIAL_SPEED = 75; // ms per ball step
const SPEED_FACTOR = 0.86; // multiplied each hit — gets ~14% faster

type Phase = 'playing' | 'hit' | 'miss' | 'won' | 'lost';

function renderTrack(pos: number, phase: Phase, theme: Theme): string {
  const inZone = pos < ZONE_WIDTH || pos >= TRACK_WIDTH - ZONE_WIDTH;
  const chars: string[] = [];
  for (let i = 0; i <= TRACK_WIDTH; i++) {
    const inLeft = i < ZONE_WIDTH;
    const inRight = i >= TRACK_WIDTH - ZONE_WIDTH + 1;
    if (i === Math.round(pos)) {
      chars.push('●');
    } else if (inLeft || inRight) {
      chars.push('▓');
    } else {
      chars.push('─');
    }
  }
  // suppress unused warning
  void inZone;
  void theme;
  return chars.join('');
}

export const RescueGameScreen: React.FC<RescueGameScreenProps> = ({ petName, theme, onWin, onLose }) => {
  const [ballPos, setBallPos] = useState(TRACK_WIDTH / 2);
  const [ballDir, setBallDir] = useState<1 | -1>(1);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [hits, setHits] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [phase, setPhase] = useState<Phase>('playing');
  const [flashMsg, setFlashMsg] = useState('');

  // Refs for values used inside interval closure
  const ballPosRef = useRef(ballPos);
  const ballDirRef = useRef(ballDir);
  const speedRef = useRef(speed);
  const hitsRef = useRef(hits);
  const livesRef = useRef(lives);
  const phaseRef = useRef(phase);

  useEffect(() => { ballPosRef.current = ballPos; }, [ballPos]);
  useEffect(() => { ballDirRef.current = ballDir; }, [ballDir]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { hitsRef.current = hits; }, [hits]);
  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Ball movement loop — restarts whenever speed changes
  useEffect(() => {
    if (phase === 'won' || phase === 'lost') return;

    const interval = setInterval(() => {
      if (phaseRef.current !== 'playing') return;

      setBallPos((prev) => {
        let next = prev + ballDirRef.current;
        if (next >= TRACK_WIDTH) {
          next = TRACK_WIDTH;
          setBallDir(-1);
          ballDirRef.current = -1;
        } else if (next <= 0) {
          next = 0;
          setBallDir(1);
          ballDirRef.current = 1;
        }
        return next;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [speed, phase]);

  const handleSpace = useCallback(() => {
    if (phaseRef.current !== 'playing') return;

    const pos = ballPosRef.current;
    const inZone = pos < ZONE_WIDTH || pos >= TRACK_WIDTH - ZONE_WIDTH + 1;

    if (inZone) {
      const nextHits = hitsRef.current + 1;
      const nextSpeed = Math.max(25, speedRef.current * SPEED_FACTOR);
      setHits(nextHits);
      setSpeed(nextSpeed);
      setPhase('hit');
      setFlashMsg(nextHits >= HITS_TO_WIN ? '✨ SAVED! ✨' : ['CATCH!', 'GREAT!', 'YES!', 'NICE!'][nextHits % 4] ?? 'CATCH!');
      setTimeout(() => {
        if (nextHits >= HITS_TO_WIN) {
          setPhase('won');
        } else {
          setPhase('playing');
        }
      }, 350);
    } else {
      const nextLives = livesRef.current - 1;
      setLives(nextLives);
      setPhase('miss');
      setFlashMsg(nextLives <= 0 ? '💀 TOO LATE...' : ['MISSED!', 'TOO EARLY!', 'WRONG!'][Math.floor(Math.random() * 3)] ?? 'MISSED!');
      setTimeout(() => {
        if (nextLives <= 0) {
          setPhase('lost');
        } else {
          setPhase('playing');
        }
      }, 400);
    }
  }, []);

  useInput((input, key) => {
    if (phase === 'won') { onWin(); return; }
    if (phase === 'lost') { onLose(); return; }
    if (input === ' ' || key.return) handleSpace();
  });

  const trackStr = renderTrack(ballPos, phase, theme);
  const livesStr = '♥'.repeat(lives) + '♡'.repeat(INITIAL_LIVES - lives);
  const progressStr = '●'.repeat(hits) + '○'.repeat(HITS_TO_WIN - hits);
  const inZone = ballPos < ZONE_WIDTH || ballPos >= TRACK_WIDTH - ZONE_WIDTH + 1;

  if (phase === 'won') {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Box borderStyle="double" borderColor="green" flexDirection="column" paddingX={3} paddingY={1} alignItems="center">
          <Text color="green" bold>💚 YOU SAVED {petName.toUpperCase()}! 💚</Text>
          <Box marginTop={1}>
            <Text color="green" bold>✨ (≧◡≦) ✨</Text>
          </Box>
          <Box marginTop={1}>
            <Text>All stats restored to </Text>
            <Text color="green" bold>100%</Text>
            <Text>!</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Press any key to continue</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  if (phase === 'lost') {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Box borderStyle="double" borderColor="red" flexDirection="column" paddingX={3} paddingY={1} alignItems="center">
          <Text color="red" bold>💀 {petName} didn't make it... 💀</Text>
          <Box marginTop={1}>
            <Text dimColor bold>(x _ x)</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Your settings, todos and memories are safe.</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Time to adopt a new companion.</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Press any key to continue</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1} paddingY={0}>
      <Box
        borderStyle="round"
        borderColor={phase === 'hit' ? 'green' : phase === 'miss' ? 'red' : theme.border}
        flexDirection="column"
        paddingX={2}
        paddingY={1}
      >
        {/* Header */}
        <Box gap={2} marginBottom={1}>
          <Text color="red" bold>💔 Emergency!</Text>
          <Text color={theme.accent} bold>Save {petName}!</Text>
          <Text dimColor>·</Text>
          <Text color={lives <= 1 ? 'red' : theme.primary}>{livesStr}</Text>
        </Box>

        {/* Flash message */}
        <Box height={1} marginBottom={1}>
          {flashMsg ? (
            <Text color={phase === 'hit' ? 'green' : 'red'} bold>{flashMsg}</Text>
          ) : (
            <Text dimColor>
              {inZone ? '▶ IN ZONE — press SPACE!' : 'Wait for the zone...'}
            </Text>
          )}
        </Box>

        {/* Track */}
        <Box flexDirection="column" marginBottom={1}>
          <Text dimColor>┌{'─'.repeat(TRACK_WIDTH + 1)}┐</Text>
          <Box>
            <Text dimColor>│</Text>
            <Text>
              {trackStr.split('').map((ch, i) => {
                const inLeft = i < ZONE_WIDTH;
                const inRight = i >= TRACK_WIDTH - ZONE_WIDTH + 1;
                const isBall = i === Math.round(ballPos);
                if (isBall) return <Text key={i} color={phase === 'hit' ? 'green' : phase === 'miss' ? 'red' : 'yellow'} bold>●</Text>;
                if (inLeft || inRight) return <Text key={i} color={theme.accent}>▓</Text>;
                return <Text key={i} dimColor>─</Text>;
              })}
            </Text>
            <Text dimColor>│</Text>
          </Box>
          <Text dimColor>└{'─'.repeat(TRACK_WIDTH + 1)}┘</Text>
        </Box>

        {/* Progress */}
        <Box gap={2}>
          <Text dimColor>Progress:</Text>
          <Text color={theme.primary}>{progressStr}</Text>
          <Text dimColor>{hits}/{HITS_TO_WIN}</Text>
        </Box>

        {/* Speed indicator */}
        <Box marginTop={1} gap={2}>
          <Text dimColor>Speed:</Text>
          <Text color={speed < 45 ? 'red' : speed < 60 ? 'yellow' : theme.accent}>
            {'█'.repeat(Math.round((INITIAL_SPEED - speed) / (INITIAL_SPEED - 25) * 10))}{'░'.repeat(10 - Math.round((INITIAL_SPEED - speed) / (INITIAL_SPEED - 25) * 10))}
          </Text>
        </Box>
      </Box>

      <Box borderStyle="single" borderColor={theme.border} paddingX={1} marginTop={1}>
        <Text color={theme.border} bold>[SPACE]</Text>
        <Text> catch in zone  ·  hit </Text>
        <Text color={theme.accent}>▓</Text>
        <Text> zones on each side</Text>
      </Box>
    </Box>
  );
};
