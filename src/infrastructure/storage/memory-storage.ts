import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CONFIG_DIR = join(homedir(), '.termochi');
const MEMORY_FILE = join(CONFIG_DIR, 'memory.json');

export interface MemoryEntry {
  text: string;
  createdAt: string;
}

export const memoryStorage = {
  readAll(): MemoryEntry[] {
    if (!existsSync(MEMORY_FILE)) return [];
    try {
      const raw = readFileSync(MEMORY_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (e): e is MemoryEntry =>
          typeof e === 'object' && e !== null &&
          typeof (e as Record<string, unknown>)['text'] === 'string' &&
          typeof (e as Record<string, unknown>)['createdAt'] === 'string'
      );
    } catch { return []; }
  },

  add(text: string): void {
    const entries = this.readAll();
    entries.push({ text: text.trim(), createdAt: new Date().toISOString() });
    this._write(entries);
  },

  clear(): void {
    this._write([]);
  },

  _write(entries: MemoryEntry[]): void {
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(MEMORY_FILE, JSON.stringify(entries, null, 2), 'utf-8');
  },
};
