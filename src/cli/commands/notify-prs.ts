import { storage } from '../../infrastructure/storage/storage.js';
import { integrationsConfigStorage } from '../../infrastructure/storage/integrations-config.js';
import { fetchGitHubData } from '../../infrastructure/integrations/github.js';
import { sendNotification } from '../../utils/notify.js';
import pc from 'picocolors';

const STALE_HOURS = 48;

export async function notifyPrsCommand(): Promise<void> {
  const pet = storage.read();
  const petName = pet?.name ?? 'Termochi';

  const integrations = integrationsConfigStorage.read();
  if (!integrations.github?.token) {
    process.exit(0); // Silent exit when not configured — cron-friendly
  }

  let data;
  try {
    data = await fetchGitHubData(integrations.github.token);
  } catch {
    process.exit(0);
  }

  const now = Date.now();
  const staleMs = STALE_HOURS * 60 * 60 * 1000;

  // Open PRs authored by me not updated in 48h
  const stalePRs = data.openPRs.filter((pr) => pr.staleHours >= STALE_HOURS);

  if (stalePRs.length > 0) {
    const titles = stalePRs.map((pr) => `#${pr.number} ${pr.title}`).join(', ');
    sendNotification(
      `${petName}: PRs need attention 👀`,
      `No review in ${STALE_HOURS}h: ${titles}`
    );
    console.log(pc.yellow(`Notified: ${stalePRs.length} stale PR(s)`));
  } else {
    console.log(pc.dim('No stale PRs found.'));
  }
}
