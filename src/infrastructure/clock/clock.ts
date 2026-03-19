export function nowISO(): string {
  return new Date().toISOString();
}

export function getElapsedMinutes(lastSeenAt: string): number {
  const last = new Date(lastSeenAt).getTime();
  const now = Date.now();
  return Math.max(0, (now - last) / 1000 / 60);
}

export function formatElapsedTime(lastSeenAt: string): string {
  const minutes = getElapsedMinutes(lastSeenAt);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${Math.floor(minutes)} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}
