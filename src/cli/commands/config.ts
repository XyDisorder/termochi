import React from 'react';
import { render } from 'ink';
import pc from 'picocolors';
import { storage } from '../../infrastructure/storage/storage.js';
import { ThemePickerScreen } from '../../ui/screens/ThemePickerScreen.js';
import type { ThemeId } from '../../domain/pet/pet.types.js';
import { getTheme } from '../../domain/theme/theme.catalog.js';

export async function configCommand(): Promise<void> {
  const state = storage.read();
  if (!state) {
    console.log(pc.yellow("No companion found. Run 'termochi' to get started!"));
    return;
  }

  const { unmount, waitUntilExit } = render(
    React.createElement(ThemePickerScreen, {
      currentTheme: state.theme,
      onSelect: (theme: ThemeId) => {
        storage.write({ ...state, theme });
        unmount();
        const t = getTheme(theme);
        console.log(pc.green(`✓ Theme changed to ${t.name} ${t.emoji}`));
      },
    })
  );

  await waitUntilExit();
}
