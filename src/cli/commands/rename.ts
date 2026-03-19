import pc from 'picocolors';
import { storage } from '../../infrastructure/storage/storage.js';

export async function renameCommand(newName: string): Promise<void> {
  const trimmed = newName.trim();
  if (!trimmed) {
    console.log(pc.red('Name cannot be empty.'));
    return;
  }

  const state = storage.read();
  if (!state) {
    console.log(pc.yellow("No companion found. Run 'termochi' to get started!"));
    return;
  }

  const oldName = state.name;
  storage.write({ ...state, name: trimmed });
  console.log(pc.green(`✓ ${oldName} is now known as ${trimmed}!`));
}
