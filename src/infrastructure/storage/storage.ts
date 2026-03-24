import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
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

  private tryRead(filePath: string): PetState | null {
    if (!existsSync(filePath)) return null;
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const parsed: unknown = JSON.parse(raw);
      const result = petStateSchema.safeParse(parsed);
      if (!result.success) return null;
      const { lastActions, ...core } = result.data;
      return (lastActions !== undefined ? { ...core, lastActions } : core) as PetState;
    } catch {
      return null;
    }
  }

  read(): PetState | null {
    // Try main file first, fall back to backup if corrupted/missing
    return this.tryRead(this.filePath) ?? this.tryRead(this.filePath + '.bak');
  }

  write(state: PetState): void {
    const dir = dirname(this.filePath);
    mkdirSync(dir, { recursive: true });
    const tmp = this.filePath + '.tmp';
    // Write to temp file first
    writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf-8');
    // Back up current state before replacing it
    if (existsSync(this.filePath)) {
      copyFileSync(this.filePath, this.filePath + '.bak');
    }
    // Atomic rename — prevents partial writes from corrupting the main file
    renameSync(tmp, this.filePath);
  }

  reset(): void {
    if (this.exists()) {
      rmSync(this.filePath);
    }
  }
}

export const storage = new Storage();
export { Storage };
