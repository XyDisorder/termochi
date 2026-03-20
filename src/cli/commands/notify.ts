import { storage } from '../../infrastructure/storage/storage.js';
import { sendNotification } from '../../utils/notify.js';

export async function notifyCommand(): Promise<void> {
  const pet = storage.read();
  if (!pet) {
    process.exit(0);
  }

  const { stats, name } = pet;
  const criticals: string[] = [];
  if (stats.hunger < 20) criticals.push('hungry');
  if (stats.energy < 20) criticals.push('exhausted');
  if (stats.health < 20) criticals.push('sick');
  if (stats.mood < 20) criticals.push('sad');
  if (stats.cleanliness < 20) criticals.push('dirty');

  if (criticals.length > 0) {
    sendNotification(
      `${name} needs you! 🆘`,
      `${name} is ${criticals.join(', ')}. Open termochi to help!`
    );
  }
}
