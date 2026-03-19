import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Theme } from '../../domain/theme/theme.types.js';

const BOARD_W = 26;
const BOARD_H = 10;
const TICK_MS = 120;
const GAME_DURATION_S = 20;
const TOTAL_TICKS = Math.round((GAME_DURATION_S * 1000) / TICK_MS);
const FALL_EVERY = 4;    // treat falls 1 row every 4 ticks (480ms)
const SPAWN_EVERY = 16;  // new treat spawns every 16 ticks (~1.9s)
const PET_ROW = BOARD_H - 1;
const PET_HALF = 2; // pet covers petX ± 2 (5 chars wide)

interface Treat {
  id: number;
  x: number;
  y: number;
}

interface PlayGameScreenProps {
  petName: string;
  theme: Theme;
  onComplete: (score: number) => void;
}

function getResultText(name: string, score: number): string {
  if (score === 0) return `Hmm... ${name} tried their best. 😅`;
  if (score <= 3) return `Not bad! ${name} had a little fun. 🙂`;
  if (score <= 6) return `Nice one! ${name} is happy! 😄`;
  if (score <= 9) return `Amazing! ${name} is thrilled! 🤩`;
  return `PERFECT GAME! ${name} absolutely loves you! 🏆`;
}

type Phase = 'playing' | 'result';

export const PlayGameScreen: React.FC<PlayGameScreenProps> = ({ petName, theme, onComplete }) => {
  const [petX, setPetX] = useState(Math.floor(BOARD_W / 2));
  const [treats, setTreats] = useState<Treat[]>([]);
  const [score, setScore] = useState(0);
  const [ticksLeft, setTicksLeft] = useState(TOTAL_TICKS);
  const [phase, setPhase] = useState<Phase>('playing');
  const [catchFlash, setCatchFlash] = useState(false);

  // Refs to read latest state inside setInterval without stale closure
  const petXRef = useRef(petX);
  const tickRef = useRef(0);
  const nextIdRef = useRef(0);
  const scoreRef = useRef(0);
  const phaseRef = useRef<Phase>('playing');

  useEffect(() => { petXRef.current = petX; }, [petX]);

  // Game loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (phaseRef.current === 'result') return;

      tickRef.current++;
      const tick = tickRef.current;

      setTicksLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          phaseRef.current = 'result';
          setPhase('result');
        }
        return next;
      });

      setTreats((prev) => {
        let updated = [...prev];

        // Spawn new treat at random x
        if (tick % SPAWN_EVERY === 0) {
          updated.push({
            id: nextIdRef.current++,
            x: Math.floor(Math.random() * BOARD_W),
            y: 0,
          });
        }

        // Move treats down every FALL_EVERY ticks
        if (tick % FALL_EVERY === 0) {
          updated = updated.map((t) => ({ ...t, y: t.y + 1 }));
        }

        // Collision detection at pet row
        const px = petXRef.current;
        const caught: number[] = [];
        const missed: number[] = [];

        updated.forEach((t) => {
          if (t.y >= PET_ROW) {
            if (Math.abs(t.x - px) <= PET_HALF) {
              caught.push(t.id);
            } else {
              missed.push(t.id);
            }
          }
        });

        if (caught.length > 0) {
          scoreRef.current += caught.length;
          setScore(scoreRef.current);
          setCatchFlash(true);
          setTimeout(() => setCatchFlash(false), 300);
        }

        return updated.filter(
          (t) => !caught.includes(t.id) && !missed.includes(t.id) && t.y < BOARD_H
        );
      });
    }, TICK_MS);

    return () => clearInterval(interval);
  }, []); // intentionally no deps — game loop runs once

  useInput(
    useCallback(
      (input, key) => {
        if (phase === 'result') {
          onComplete(scoreRef.current);
          return;
        }
        if (key.leftArrow || input === 'a') {
          setPetX((prev) => Math.max(PET_HALF, prev - 3));
        } else if (key.rightArrow || input === 'd') {
          setPetX((prev) => Math.min(BOARD_W - 1 - PET_HALF, prev + 3));
        }
      },
      [phase, onComplete]
    )
  );

  const timeLeft = Math.ceil((ticksLeft / TOTAL_TICKS) * GAME_DURATION_S);
  const timerColor = timeLeft <= 5 ? 'red' : timeLeft <= 10 ? 'yellow' : theme.accent;

  // Build board as a 2D char + color array
  type Cell = { ch: string; color: string | undefined; bold?: boolean };
  const board: Cell[][] = Array.from({ length: BOARD_H }, () =>
    Array.from({ length: BOARD_W }, () => ({ ch: '·', color: undefined }))
  );

  // Place treats
  treats.forEach((t) => {
    if (t.y >= 0 && t.y < BOARD_H && t.x >= 0 && t.x < BOARD_W) {
      const row = board[t.y];
      if (row) row[t.x] = { ch: '✦', color: theme.accent };
    }
  });

  // Place pet (5 chars wide: ╰─◉─╯ or flashing ╰─😋─╯ on catch)
  const petRow = board[PET_ROW];
  if (petRow) {
    const petColor = catchFlash ? theme.accent : theme.primary;
    const centerChar = catchFlash ? '★' : '◉';
    for (let dx = -PET_HALF; dx <= PET_HALF; dx++) {
      const col = petX + dx;
      if (col >= 0 && col < BOARD_W) {
        const ch =
          dx === 0 ? centerChar : dx === -PET_HALF ? '╰' : dx === PET_HALF ? '╯' : '─';
        petRow[col] = { ch, color: petColor, bold: true };
      }
    }
  }

  return (
    <Box flexDirection="column" paddingX={2}>
      {/* Header */}
      <Box
        borderStyle="round"
        borderColor={theme.border}
        flexDirection="column"
        paddingX={1}
        paddingY={0}
      >
        <Box justifyContent="space-between" marginBottom={1}>
          <Text color={theme.primary} bold>
            🎮 Catch the treats!
          </Text>
          <Box gap={3}>
            <Text color={theme.accent}>
              ✦ {score}
            </Text>
            <Text color={timerColor} bold={timeLeft <= 5}>
              ⏱ {timeLeft}s
            </Text>
          </Box>
        </Box>

        {/* Board */}
        <Box flexDirection="column">
          {board.map((row, rowIdx) => (
            <Box key={rowIdx}>
              <Text color={theme.border}>│</Text>
              {renderRow(row)}
              <Text color={theme.border}>│</Text>
            </Box>
          ))}
        </Box>

        {/* Instructions */}
        <Box marginTop={1} justifyContent="center">
          {phase === 'playing' ? (
            <Text dimColor>← → or A D to move</Text>
          ) : (
            <Text color={theme.primary} bold>
              Press any key to continue
            </Text>
          )}
        </Box>
      </Box>

      {/* Result overlay */}
      {phase === 'result' && (
        <Box
          borderStyle="round"
          borderColor={theme.accent}
          marginTop={1}
          paddingX={2}
          flexDirection="column"
          alignItems="center"
        >
          <Text color={theme.accent} bold>
            {getResultText(petName, score)}
          </Text>
          <Text dimColor>
            {score} treat{score !== 1 ? 's' : ''} caught
            {score >= 7 ? ' — incredible run!' : score >= 4 ? ' — solid effort!' : ''}
          </Text>
        </Box>
      )}
    </Box>
  );
};

// Render a row as inline colored Text spans (groups consecutive same-color cells)
type Cell = { ch: string; color: string | undefined; bold?: boolean };

function renderRow(row: Cell[]): React.ReactNode {
  // Group consecutive cells with same color
  const segments: Array<{ text: string; color: string | undefined; bold: boolean }> = [];
  for (const cell of row) {
    const last = segments[segments.length - 1];
    if (last && last.color === cell.color && last.bold === (cell.bold ?? false)) {
      last.text += cell.ch;
    } else {
      segments.push({ text: cell.ch, color: cell.color, bold: cell.bold ?? false });
    }
  }
  return segments.map((seg, i) =>
    seg.color !== undefined ? (
      <Text key={i} color={seg.color} bold={seg.bold}>
        {seg.text}
      </Text>
    ) : (
      <Text key={i} dimColor>
        {seg.text}
      </Text>
    )
  );
}
