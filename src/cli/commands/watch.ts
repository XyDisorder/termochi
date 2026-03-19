import React from 'react';
import { render } from 'ink';
import { WatchScreen } from '../../ui/screens/WatchScreen.js';

export async function watchCommand(opts: { interval?: number } = {}): Promise<void> {
  const refreshMs = (opts.interval ?? 5) * 60 * 1000;
  const { waitUntilExit } = render(
    React.createElement(WatchScreen, { refreshInterval: refreshMs })
  );
  await waitUntilExit();
}
