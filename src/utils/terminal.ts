import { stdout } from 'node:process';

export function getTerminalWidth(): number {
  return stdout.columns ?? 80;
}

export function getTerminalHeight(): number {
  return stdout.rows ?? 24;
}

export function clearScreen(): void {
  process.stdout.write('\x1Bc');
}
