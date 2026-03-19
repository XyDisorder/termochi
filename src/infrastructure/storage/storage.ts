import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import type { PetState } from '../../domain/pet/pet.types.js';
import { petStateSchema } from './storage.schemas.js';

const STORAGE_DIR = join(homedir(), '.termochi');
const STORAGE_FILE = join(STORAGE_DIR, 'state.json');

class Storage {
  private readonly filePath: string;

  constructor(filePath: string = STORAGE_FILE) {
    this.filePath = filePath;
  }

  exists(): boolean {
    return existsSync(this.filePath);
  }

  read(): PetState | null {
    if (!this.exists()) {
      return null;
    }

    try {
      const raw = readFileSync(this.filePath, 'utf-8');
      const parsed: unknown = JSON.parse(raw);
      const result = petStateSchema.safeParse(parsed);
      if (!result.success) {
        console.error('Storage validation failed:', result.error.message);
        return null;
      }
      // Strip undefined optional fields to satisfy exactOptionalPropertyTypes
      const { lastActions, ...core } = result.data;
      return (lastActions !== undefined ? { ...core, lastActions } : core) as PetState;
    } catch (err) {
      console.error('Failed to read storage:', err);
      return null;
    }
  }

  write(state: PetState): void {
    const dir = dirname(this.filePath);
    mkdirSync(dir, { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(state, null, 2), 'utf-8');
  }

  reset(): void {
    if (this.exists()) {
      rmSync(this.filePath);
    }
  }
}

export const storage = new Storage();
export { Storage };
