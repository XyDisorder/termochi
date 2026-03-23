import ical from 'node-ical';
import type { VEvent } from 'node-ical';

export interface CalendarEvent {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  meetingUrl?: string;
}

// Extract Zoom, Google Meet, Teams, Whereby URLs from description/location
function extractMeetingUrl(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const match = text.match(
    /(https?:\/\/(?:[a-z0-9-]+\.)?(?:zoom\.us|meet\.google\.com|teams\.microsoft\.com|whereby\.com|webex\.com|around\.co)[^\s"'<>\]]+)/i
  );
  return match?.[0];
}

function toString(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null && 'val' in val) return String((val as { val: unknown }).val);
  return String(val);
}

export async function fetchTodayEvents(icsUrl: string): Promise<CalendarEvent[]> {
  const data = await ical.async.fromURL(icsUrl);

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const events: CalendarEvent[] = [];

  for (const component of Object.values(data)) {
    if (!component || component.type !== 'VEVENT') continue;
    const event = component as VEvent;
    if (!event.start) continue;

    const desc = toString(event.description);
    const loc = toString(event.location);
    const meetingUrl = extractMeetingUrl(desc) ?? extractMeetingUrl(loc);
    const title = toString(event.summary) || 'Meeting';

    // Recurring events
    if (event.rrule) {
      const occurrences = event.rrule.between(todayStart, todayEnd, true);
      const duration = event.end
        ? event.end.getTime() - event.start.getTime()
        : 3_600_000;
      for (const occ of occurrences) {
        events.push({
          id: `${event.uid}-${occ.toISOString()}`,
          title,
          startAt: occ,
          endAt: new Date(occ.getTime() + duration),
          ...(meetingUrl ? { meetingUrl } : {}),
        });
      }
      continue;
    }

    // Single event
    const start = event.start;
    if (start >= todayStart && start <= todayEnd) {
      events.push({
        id: event.uid,
        title,
        startAt: start,
        endAt: event.end ?? new Date(start.getTime() + 3_600_000),
        ...(meetingUrl ? { meetingUrl } : {}),
      });
    }
  }

  return events.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}
