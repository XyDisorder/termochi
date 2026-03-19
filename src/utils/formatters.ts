export function formatAge(createdAt: string): string {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const minutesElapsed = Math.max(0, (now - created) / 1000 / 60);

  if (minutesElapsed < 60) {
    const minutes = Math.floor(minutesElapsed);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} old`;
  }

  const hoursElapsed = Math.floor(minutesElapsed / 60);
  if (hoursElapsed < 24) {
    return `${hoursElapsed} hour${hoursElapsed !== 1 ? 's' : ''} old`;
  }

  const daysElapsed = Math.floor(hoursElapsed / 24);
  return `${daysElapsed} day${daysElapsed !== 1 ? 's' : ''} old`;
}

export function formatStatBar(value: number, width: number = 10): string {
  const clamped = Math.min(100, Math.max(0, value));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

export function formatStat(value: number, width: number = 10): string {
  const clamped = Math.min(100, Math.max(0, value));
  const bar = formatStatBar(clamped, width);
  return `${bar} ${Math.round(clamped)}%`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
