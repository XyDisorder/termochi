import type { ThemeId } from '../pet/pet.types.js';
import type { Theme } from './theme.types.js';

export const THEME_CATALOG: Theme[] = [
  {
    id: 'pastel',
    name: 'Pastel',
    primary: '#FFB3C6',
    accent: '#B3E5FC',
    border: '#E0D5FF',
    emoji: '🌸',
  },
  {
    id: 'terminal-green',
    name: 'Terminal Green',
    primary: '#00FF41',
    accent: '#39FF14',
    border: '#008F11',
    emoji: '💚',
  },
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    primary: '#00FFFF',
    accent: '#FF00FF',
    border: '#FF00FF',
    emoji: '⚡',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    primary: '#FF6B35',
    accent: '#FFD700',
    border: '#FF4500',
    emoji: '🌅',
  },
  {
    id: 'mono',
    name: 'Mono',
    primary: 'white',
    accent: 'gray',
    border: 'gray',
    emoji: '◻',
  },
];

export function getTheme(id: ThemeId): Theme {
  const theme = THEME_CATALOG.find((t) => t.id === id);
  if (!theme) {
    throw new Error(`Unknown theme: ${id}`);
  }
  return theme;
}

export function getThemeByIndex(i: number): Theme {
  const theme = THEME_CATALOG[i % THEME_CATALOG.length];
  if (!theme) {
    throw new Error(`No theme at index: ${i}`);
  }
  return theme;
}
