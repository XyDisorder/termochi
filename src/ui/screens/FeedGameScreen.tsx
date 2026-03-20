import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Theme } from '../../domain/theme/theme.types.js';

const BOARD_W = 26;
const BOARD_H = 10;
const TICK_MS = 120;
const GAME_DURATION_S = 15;
const TOTAL_TICKS = Math.round((GAME_DURATION_S * 1000) / TICK_MS);
const FALL_EVERY = 4;   // item falls 1 row every 4 ticks
const SPAWN_EVERY = 14; // new item spawns every 14 ticks (~1.7s)
const PET_ROW = BOARD_H - 1;
const PET_HALF = 2;

// ~70% chance a spawned item is food, 30% junk
const FOOD_CHANCE = 0.70;

interface FoodItem {
  id: number;
  x: number;
  y: number;
  isFood: boolean; // true = yummy, false = junk (avoid!)
}

interface FeedGameScreenProps {
  petName: string;
  theme: Theme;
  initialHunger: number;
  onComplete: (score: number) => void;
}

function hungerFromScore(initialHunger: number, score: number): number {
  return Math.min(initialHunger + Math.min(15 + score * 5, 60), 100);
}

function HungerBar({ value, theme }: { value: number; theme: Theme }) {
  const filled = Math.round(value / 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
  const color = value < 25 ? 'red' : value < 50 ? 'yellow' : theme.primary;
  return (
    <Box gap={1} alignItems="center">
      <Text dimColor>Hunger</Text>
      <Text color={color}>{bar}</Text>
      <Text color={color} bold>{String(Math.round(value)).padStart(3)}%</Text>
    </Box>
  );
}

function getResultText(name: string, score: number): string {
  if (score <= 0) return `${name} got nothing... and ate some junk. 😬`;
  if (score <= 2) return `A few bites for ${name}! 🙂`;
  if (score <= 5) return `${name} had a good meal! 😄`;
  if (score <= 8) return `${name} is stuffed and happy! 🤩`;
  return `FEAST! ${name} is absolutely thriving! 🏆`;
}

type Phase = 'playing' | 'result';

export const FeedGameScreen: React.FC<FeedGameScreenProps> = ({ petName, theme, initialHunger, onComplete }) => {
  const [petX, setPetX] = useState(Math.floor(BOARD_W / 2));
  const [items, setItems] = useState<FoodItem[]>([]);
  const [score, setScore] = useState(0);
  const [ticksLeft, setTicksLeft] = useState(TOTAL_TICKS);
  const [phase, setPhase] = useState<Phase>('playing');
  const [catchFlash, setCatchFlash] = useState<'food' | 'junk' | null>(null);

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

      setItems((prev) => {
        let updated = [...prev];

        // Spawn new item
        if (tick % SPAWN_EVERY === 0) {
          updated.push({
            id: nextIdRef.current++,
            x: Math.floor(Math.random() * BOARD_W),
            y: 0,
            isFood: Math.random() < FOOD_CHANCE,
          });
        }

        // Move items down
        if (tick % FALL_EVERY === 0) {
          updated = updated.map((t) => ({ ...t, y: t.y + 1 }));
        }

        // Collision at pet row
        const px = petXRef.current;
        const caught: FoodItem[] = [];
        const missed: number[] = [];

        updated.forEach((t) => {
          if (t.y >= PET_ROW) {
            if (Math.abs(t.x - px) <= PET_HALF) {
              caught.push(t);
            } else {
              missed.push(t.id);
            }
          }
        });

        if (caught.length > 0) {
          let delta = 0;
          let hitFood = false;
          let hitJunk = false;
          caught.forEach((t) => {
            if (t.isFood) { delta++; hitFood = true; }
            else { delta--; hitJunk = true; }
          });
          scoreRef.current = Math.max(0, scoreRef.current + delta);
          setScore(scoreRef.current);
          setCatchFlash(hitJunk ? 'junk' : 'food');
          process.stdout.write('\x07');
          setTimeout(() => setCatchFlash(null), 300);
        }

        const caughtIds = caught.map((t) => t.id);
        return updated.filter(
          (t) => !caughtIds.includes(t.id) && !missed.includes(t.id) && t.y < BOARD_H
        );
      });
    }, TICK_MS);

    return () => clearInterval(interval);
  }, []);

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
  const timerColor = timeLeft <= 5 ? 'red' : timeLeft <= 8 ? 'yellow' : theme.accent;

  type Cell = { ch: string; color: string | undefined; bold?: boolean };
  const board: Cell[][] = Array.from({ length: BOARD_H }, () =>
    Array.from({ length: BOARD_W }, () => ({ ch: '·', color: undefined }))
  );

  // Place food items
  items.forEach((t) => {
    if (t.y >= 0 && t.y < BOARD_H && t.x >= 0 && t.x < BOARD_W) {
      const row = board[t.y];
      if (row) {
        row[t.x] = t.isFood
          ? { ch: '●', color: theme.accent }
          : { ch: '✕', color: 'red' };
      }
    }
  });

  // Place pet
  const petRow = board[PET_ROW];
  if (petRow) {
    const petColor =
      catchFlash === 'food' ? theme.accent : catchFlash === 'junk' ? 'red' : theme.primary;
    const centerChar = catchFlash === 'food' ? '★' : catchFlash === 'junk' ? '✕' : '◉';
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
      <Box
        borderStyle="round"
        borderColor={theme.border}
        flexDirection="column"
        paddingX={1}
        paddingY={0}
      >
        <Box justifyContent="space-between" marginBottom={1}>
          <Text color={theme.primary} bold>
            🍖 Catch the food!
          </Text>
          <Box gap={3}>
            <Text color={theme.accent}>● {score}</Text>
            <Text color={timerColor} bold={timeLeft <= 5}>
              ⏱ {timeLeft}s
            </Text>
          </Box>
        </Box>

        <Box flexDirection="column">
          {board.map((row, rowIdx) => (
            <Box key={rowIdx}>
              <Text color={theme.border}>│</Text>
              {renderRow(row)}
              <Text color={theme.border}>│</Text>
            </Box>
          ))}
        </Box>

        <Box marginTop={1}>
          <HungerBar value={hungerFromScore(initialHunger, score)} theme={theme} />
        </Box>

        <Box marginTop={1} justifyContent="center">
          {phase === 'playing' ? (
            <Text dimColor>← → or A D to move  ·  ● = food  ✕ = junk</Text>
          ) : (
            <Text color={theme.primary} bold>
              Press any key to continue
            </Text>
          )}
        </Box>
      </Box>

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
            {score} food item{score !== 1 ? 's' : ''} caught
            {score >= 6 ? ' — incredible feast!' : score >= 3 ? ' — decent meal!' : ''}
          </Text>
        </Box>
      )}
    </Box>
  );
};

type Cell = { ch: string; color: string | undefined; bold?: boolean };

function renderRow(row: Cell[]): React.ReactNode {
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
