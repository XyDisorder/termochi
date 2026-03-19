import pc from 'picocolors';
import * as readline from 'node:readline';
import { storage } from '../../infrastructure/storage/storage.js';

export async function resetCommand(): Promise<void> {
  const state = storage.read();
  if (!state) {
    console.log(pc.yellow('No companion to reset.'));
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  await new Promise<void>((resolve) => {
    rl.question(
      pc.red(`⚠️  Are you sure you want to say goodbye to ${state.name}? This cannot be undone. [y/N] `),
      (answer) => {
        rl.close();
        if (answer.toLowerCase() === 'y') {
          storage.reset();
          console.log(pc.dim(`${state.name} has gone to a better place... 💧`));
          console.log(pc.cyan("Run 'termochi' to start fresh!"));
        } else {
          console.log(pc.green(`${state.name} is safe! Phew. 💙`));
        }
        resolve();
      }
    );
  });
}
