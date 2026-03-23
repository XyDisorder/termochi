import { integrationsConfigStorage } from '../../infrastructure/storage/integrations-config.js';
import { fetchTodayEvents } from '../../infrastructure/integrations/calendar.js';
import { sendNotification } from '../../utils/notify.js';

export async function notifyMeetingsCommand(): Promise<void> {
  const cfg = integrationsConfigStorage.read();
  if (!cfg.calendar?.icsUrl) return; // silent if not configured

  let events;
  try {
    events = await fetchTodayEvents(cfg.calendar.icsUrl);
  } catch {
    return; // silent failure (network, bad URL, etc.)
  }

  const now = new Date();

  for (const event of events) {
    const minutesUntil = (event.startAt.getTime() - now.getTime()) / 60_000;

    // 10-minute warning (9–11 min window to account for cron imprecision)
    if (minutesUntil >= 9 && minutesUntil <= 11) {
      const body = event.meetingUrl ?? 'Check your calendar';
      sendNotification(`⏰ ${event.title} — in 10 min`, body);
    }

    // Starting now (−1 to +1 min window)
    if (minutesUntil >= -1 && minutesUntil <= 1) {
      const body = event.meetingUrl ?? "Time to join!";
      sendNotification(`🔴 ${event.title} — NOW`, body);
      process.stdout.write('\x07'); // terminal bell
    }
  }
}
