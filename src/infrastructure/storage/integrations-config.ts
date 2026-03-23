import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CONFIG_DIR = join(homedir(), '.termochi');
const INTEGRATIONS_FILE = join(CONFIG_DIR, 'integrations.json');

export interface GitHubConfig {
  token: string;
}

export interface LinearConfig {
  apiKey: string;
}

export interface CalendarConfig {
  icsUrl: string;
}

export interface IntegrationsConfig {
  github?: GitHubConfig;
  linear?: LinearConfig;
  calendar?: CalendarConfig;
  githubWidget?: boolean;
  calendarWidget?: boolean;
}

export const integrationsConfigStorage = {
  exists(): boolean {
    return existsSync(INTEGRATIONS_FILE);
  },

  read(): IntegrationsConfig {
    if (!this.exists()) return {};
    try {
      const raw = readFileSync(INTEGRATIONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed !== 'object' || parsed === null) return {};
      const obj = parsed as Record<string, unknown>;
      const result: IntegrationsConfig = {};

      if (typeof obj['github'] === 'object' && obj['github'] !== null) {
        const gh = obj['github'] as Record<string, unknown>;
        if (typeof gh['token'] === 'string') {
          result.github = { token: gh['token'] };
        }
      }
      if (typeof obj['linear'] === 'object' && obj['linear'] !== null) {
        const lin = obj['linear'] as Record<string, unknown>;
        if (typeof lin['apiKey'] === 'string') {
          result.linear = { apiKey: lin['apiKey'] };
        }
      }
      if (typeof obj['calendar'] === 'object' && obj['calendar'] !== null) {
        const cal = obj['calendar'] as Record<string, unknown>;
        if (typeof cal['icsUrl'] === 'string') {
          result.calendar = { icsUrl: cal['icsUrl'] };
        }
      }
      if (typeof obj['githubWidget'] === 'boolean') {
        result.githubWidget = obj['githubWidget'];
      }
      if (typeof obj['calendarWidget'] === 'boolean') {
        result.calendarWidget = obj['calendarWidget'];
      }
      return result;
    } catch { return {}; }
  },

  write(config: IntegrationsConfig): void {
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(INTEGRATIONS_FILE, JSON.stringify(config, null, 2), 'utf-8');
  },
};
