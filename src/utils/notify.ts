import { execSync } from 'child_process';

export function sendNotification(title: string, body: string): void {
  try {
    const escaped = body.replace(/"/g, '\\"');
    const escapedTitle = title.replace(/"/g, '\\"');
    execSync(`osascript -e 'display notification "${escaped}" with title "${escapedTitle}"'`, {
      stdio: 'ignore',
      timeout: 2000,
    });
  } catch {
    // Silently ignore if notifications not available
  }
}
