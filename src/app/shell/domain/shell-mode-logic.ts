import type {
  Onboarding,
  OnboardingUnlockId,
} from '@app/onboarding/domain/models/onboarding.model';
import { isUnlocked } from '@app/onboarding/domain/onboarding-logic';

import { SHELL_MODES, ShellMode, ZoomDirection } from './models/shell-mode.model';

/** Pfad je Modus; die Szene ist die Startseite. */
export const SHELL_MODE_PATHS: Readonly<Record<ShellMode, string>> = {
  map: 'umgebung',
  scene: '',
  gen: 'genom',
};

/** Freischaltung je Modus (US-09.04, Game-Design §4.18); die Szene ist immer erreichbar. */
export const SHELL_MODE_UNLOCKS: Readonly<Record<ShellMode, OnboardingUnlockId | null>> = {
  map: 'map',
  scene: null,
  gen: 'genome',
};

/** Modus zum ersten Pfadsegment; Unbekanntes zeigt die Szene. */
export function shellModeFromPath(path: string): ShellMode {
  return SHELL_MODES.find((mode) => SHELL_MODE_PATHS[mode] === path) ?? 'scene';
}

/** Freigeschaltete Modi in Zoom-Reihenfolge; die Szene ist immer dabei. */
export function unlockedModes(onboarding: Onboarding): readonly ShellMode[] {
  return SHELL_MODES.filter((mode) => {
    const unlock = SHELL_MODE_UNLOCKS[mode];
    return unlock === null || isUnlocked(onboarding, unlock);
  });
}

/**
 * Nachbarmodus beim Zoomen (Mausrad, Pinch) unter den erreichbaren Modi; gesperrte werden
 * übersprungen. `null` am Ende der Reihe.
 */
export function neighborMode(
  mode: ShellMode,
  direction: ZoomDirection,
  modes: readonly ShellMode[] = SHELL_MODES,
): ShellMode | null {
  const step = direction === 'in' ? 1 : -1;
  for (
    let index = SHELL_MODES.indexOf(mode) + step;
    index >= 0 && index < SHELL_MODES.length;
    index += step
  ) {
    const candidate = SHELL_MODES[index];
    if (candidate !== undefined && modes.includes(candidate)) {
      return candidate;
    }
  }
  return null;
}
