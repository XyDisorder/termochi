import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CONFIG_DIR = join(homedir(), '.termochi');
const AI_CONFIG_FILE = join(CONFIG_DIR, 'ai-config.json');

export type AiProvider = 'claude' | 'openai';

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
}

export const aiConfigStorage = {
  exists(): boolean {
    return existsSync(AI_CONFIG_FILE);
  },
  read(): AiConfig | null {
    if (!this.exists()) return null;
    try {
      const raw = readFileSync(AI_CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;
      if (
        typeof parsed === 'object' && parsed !== null &&
        'provider' in parsed && 'apiKey' in parsed &&
        (parsed.provider === 'claude' || parsed.provider === 'openai') &&
        typeof parsed.apiKey === 'string'
      ) {
        return { provider: parsed.provider, apiKey: parsed.apiKey };
      }
      return null;
    } catch { return null; }
  },
  write(config: AiConfig): void {
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(AI_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  },
  delete(): void {
    if (this.exists()) {
      import('node:fs').then(({ rmSync }) => rmSync(AI_CONFIG_FILE));
    }
  },
};
