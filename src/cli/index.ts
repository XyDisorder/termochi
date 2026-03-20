#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json
const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8')) as { version: string };

const program = new Command();

program
  .name('termochi')
  .description('A cozy terminal tamagotchi companion 🌸')
  .version(pkg.version);

// Default action (no subcommand) — launch interactive UI
program
  .action(async () => {
    const { launchApp } = await import('./commands/launch.js');
    await launchApp();
  });

// Subcommands
program
  .command('feed')
  .description('Feed your companion')
  .action(async () => {
    const { feedCommand } = await import('./commands/feed.js');
    await feedCommand();
  });

program
  .command('play')
  .description('Play with your companion')
  .action(async () => {
    const { playCommand } = await import('./commands/play.js');
    await playCommand();
  });

program
  .command('sleep')
  .description('Put your companion to sleep')
  .action(async () => {
    const { sleepCommand } = await import('./commands/sleep-cmd.js');
    await sleepCommand();
  });

program
  .command('clean')
  .description("Clean your companion's space")
  .action(async () => {
    const { cleanCommand } = await import('./commands/clean.js');
    await cleanCommand();
  });

program
  .command('stats')
  .description('Show detailed stats')
  .action(async () => {
    const { statsCommand } = await import('./commands/stats.js');
    await statsCommand();
  });

program
  .command('config')
  .description('Configure theme and settings')
  .action(async () => {
    const { configCommand } = await import('./commands/config.js');
    await configCommand();
  });

program
  .command('rename <name>')
  .description('Rename your companion')
  .action(async (name: string) => {
    const { renameCommand } = await import('./commands/rename.js');
    await renameCommand(name);
  });

program
  .command('reset')
  .description('Reset and start over (destructive!)')
  .action(async () => {
    const { resetCommand } = await import('./commands/reset.js');
    await resetCommand();
  });

program
  .command('doctor')
  .description('Check local config and state')
  .action(async () => {
    const { doctorCommand } = await import('./commands/doctor.js');
    await doctorCommand();
  });

program
  .command('prompt')
  .description('Output a compact status line for shell prompt / tmux integration')
  .option('--compact', 'Extra-short output for tmux statusline')
  .action(async (opts: { compact?: boolean }) => {
    const { promptCommand } = await import('./commands/prompt.js');
    await promptCommand(opts);
  });

program
  .command('watch')
  .description('Compact live view — pin it in a tmux pane')
  .option('-i, --interval <minutes>', 'Refresh interval in minutes', '5')
  .action(async (opts: { interval?: string }) => {
    const { watchCommand } = await import('./commands/watch.js');
    await watchCommand({ interval: opts.interval ? parseInt(opts.interval, 10) : 5 });
  });

program
  .command('notify')
  .description('Send a desktop notification if stats are critical (useful for cron: */30 * * * * termochi notify)')
  .action(async () => {
    const { notifyCommand } = await import('./commands/notify.js');
    await notifyCommand();
  });

program
  .command('commit')
  .description("Ask your companion to summarize today's git commits")
  .action(async () => {
    const { commitDigestCommand } = await import('./commands/commit-digest.js');
    await commitDigestCommand();
  });

program
  .command('notify-prs')
  .description('Notify if any open PR has had no activity for 48h (cron: 0 9 * * * termochi notify-prs)')
  .action(async () => {
    const { notifyPrsCommand } = await import('./commands/notify-prs.js');
    await notifyPrsCommand();
  });

await program.parseAsync(process.argv);
