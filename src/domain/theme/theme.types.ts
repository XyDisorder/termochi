import type { ThemeId } from '../pet/pet.types.js';

export interface Theme {
  id: ThemeId;
  name: string;
  primary: string; // Ink color (hex or named)
  accent: string;
  border: string;
  emoji: string; // decorative emoji for the theme
}
