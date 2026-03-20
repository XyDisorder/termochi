import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';

const CONFIG_DIR = join(homedir(), '.termochi');
const TODOS_FILE = join(CONFIG_DIR, 'todos.json');

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

function readRaw(): TodoItem[] {
  if (!existsSync(TODOS_FILE)) return [];
  try {
    const parsed = JSON.parse(readFileSync(TODOS_FILE, 'utf-8')) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is TodoItem => {
      if (typeof item !== 'object' || item === null) return false;
      const obj = item as Record<string, unknown>;
      return (
        typeof obj['id'] === 'string' &&
        typeof obj['text'] === 'string' &&
        typeof obj['done'] === 'boolean' &&
        typeof obj['createdAt'] === 'string'
      );
    });
  } catch { return []; }
}

function writeRaw(items: TodoItem[]): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(TODOS_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

export const todoStorage = {
  readAll(): TodoItem[] {
    return readRaw();
  },

  add(text: string): TodoItem {
    const item: TodoItem = {
      id: randomUUID(),
      text,
      done: false,
      createdAt: new Date().toISOString(),
    };
    writeRaw([...readRaw(), item]);
    return item;
  },

  toggle(id: string): void {
    writeRaw(readRaw().map((item) =>
      item.id === id ? { ...item, done: !item.done } : item
    ));
  },

  delete(id: string): void {
    writeRaw(readRaw().filter((item) => item.id !== id));
  },
};
