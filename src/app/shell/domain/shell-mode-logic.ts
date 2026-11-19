import { SHELL_MODES, ShellMode, ZoomDirection } from './models/shell-mode.model';

/** Pfad je Modus; die Szene ist die Startseite. */
export const SHELL_MODE_PATHS: Readonly<Record<ShellMode, string>> = {
  map: 'umgebung',
  scene: '',
  gen: 'genom',
};

/** Modus zum ersten Pfadsegment; Unbekanntes zeigt die Szene. */
export function shellModeFromPath(path: string): ShellMode {
  return SHELL_MODES.find((mode) => SHELL_MODE_PATHS[mode] === path) ?? 'scene';
}

/** Nachbarmodus beim Zoomen (Mausrad); `null` am Ende der Reihe. */
export function neighborMode(mode: ShellMode, direction: ZoomDirection): ShellMode | null {
  const index = SHELL_MODES.indexOf(mode) + (direction === 'in' ? 1 : -1);
  return SHELL_MODES[index] ?? null;
}
