// Bootstrap is handled by the launch command
// This file exists for future initialization hooks
export async function bootstrap(): Promise<void> {
  const { launchApp } = await import('../cli/commands/launch.js');
  await launchApp();
}
