import { execSync } from 'node:child_process';
import { storage } from '../../infrastructure/storage/storage.js';
import { aiConfigStorage } from '../../infrastructure/storage/ai-config.js';
import { memoryStorage } from '../../infrastructure/storage/memory-storage.js';
import { sendAiMessage } from '../../infrastructure/integrations/ai-chat.js';
import { getMoodLabel } from '../../domain/pet/pet.logic.js';
import pc from 'picocolors';

export async function commitDigestCommand(): Promise<void> {
  const pet = storage.read();
  if (!pet) {
    console.log(pc.red('No companion found. Run termochi first.'));
    process.exit(1);
  }

  const aiConfig = aiConfigStorage.read();
  if (!aiConfig) {
    console.log(pc.yellow(`${pet.name} can't summarize commits without an AI key.`));
    console.log(pc.dim('Run termochi and press [,] to configure.'));
    process.exit(1);
  }

  // Get today's commits from git
  let gitLog = '';
  try {
    gitLog = execSync(
      'git log --since=midnight --oneline --no-merges 2>/dev/null',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
  } catch {
    console.log(pc.yellow('No git repository found in the current directory.'));
    process.exit(1);
  }

  if (!gitLog) {
    console.log(pc.dim(`${pet.name}: No commits today. What are you waiting for? 👀`));
    process.exit(0);
  }

  const commitLines = gitLog.split('\n');
  console.log(pc.dim(`Found ${commitLines.length} commit(s) today. Asking ${pet.name}...`));

  const ctx = {
    name: pet.name,
    species: pet.species,
    moodLabel: getMoodLabel(pet.stats),
    stats: pet.stats,
    memories: memoryStorage.readAll().map((m) => m.text),
  };

  const prompt = `Here are my git commits from today:\n\n${gitLog}\n\nGive me a brief summary of what I accomplished today, as if you're telling me about my own work. Be natural and direct — mention what areas I touched and what the overall theme of the day was. A few sentences max.`;

  try {
    const reply = await sendAiMessage(aiConfig, ctx, [{ role: 'user', content: prompt }]);
    console.log('');
    console.log(pc.bold(pc.cyan(pet.name)) + pc.dim(' › ') + reply);
    console.log('');
  } catch (err: unknown) {
    console.log(pc.red('AI error: ' + String(err instanceof Error ? err.message : err)));
    process.exit(1);
  }
}
