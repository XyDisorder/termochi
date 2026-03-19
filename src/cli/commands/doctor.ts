import pc from 'picocolors';
import { storage } from '../../infrastructure/storage/storage.js';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';

export async function doctorCommand(): Promise<void> {
  console.log('');
  console.log(pc.bold(pc.cyan('  🩺 Termochi Doctor')));
  console.log('');

  const dataDir = join(homedir(), '.termochi');
  const stateFile = join(dataDir, 'state.json');

  const dirExists = existsSync(dataDir);
  const fileExists = existsSync(stateFile);

  console.log(`  Data directory: ${dirExists ? pc.green('✓') : pc.red('✗')} ${dataDir}`);
  console.log(`  State file:     ${fileExists ? pc.green('✓') : pc.yellow('–')} ${stateFile}`);

  const state = storage.read();
  if (state) {
    console.log(`  Pet state:      ${pc.green('✓')} Valid (${state.name} the ${state.species})`);
    console.log(`  Game mode:      ${pc.dim(state.gameMode)}`);
    console.log(`  Theme:          ${pc.dim(state.theme)}`);
  } else if (fileExists) {
    console.log(`  Pet state:      ${pc.red('✗')} Invalid or corrupted state file`);
  } else {
    console.log(`  Pet state:      ${pc.yellow('–')} No companion yet`);
  }

  console.log('');

  // Node version check
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1).split('.')[0] ?? '0', 10);
  const nodeOk = major >= 18;
  console.log(`  Node.js:        ${nodeOk ? pc.green('✓') : pc.red('✗')} ${nodeVersion}${!nodeOk ? ' (requires >=18)' : ''}`);
  console.log('');
}
