import { SHELL_MODES, ShellMode, ZoomDirection } from './models/shell-mode.model';

/** Sperre nach einem Moduswechsel per Mausrad, damit ein Schwung nur einen Wechsel auslöst. */
export const WHEEL_LOCK_MS = 900;

/** Kleinere Ausschläge (in Pixeln) sind Trackpad-Rauschen und lösen nichts aus. */
export const WHEEL_MIN_DELTA = 4;

/** Pixel je Zeile, wenn der Browser das Rad in Zeilen meldet (`deltaMode` 1, z. B. Firefox). */
export const WHEEL_LINE_PX = 16;

/** `WheelEvent.deltaMode`: 0 Pixel, 1 Zeilen, 2 Seiten. */
export const WHEEL_DELTA_LINE = 1;
export const WHEEL_DELTA_PAGE = 2;

/** Tastenkürzel je Modus (Mockup K2-K), als Werte für `aria-keyshortcuts`. */
export const SHELL_MODE_SHORTCUTS: Readonly<Record<ShellMode, string>> = {
  map: 'W',
  scene: 'Escape',
  gen: 'G',
};

export interface WheelZoom {
  readonly direction: ZoomDirection;
  readonly lockedUntilMs: number;
}

/** Was an einer Taste außer ihrem Namen zählt; `KeyboardEvent` erfüllt die Form. */
export interface ShortcutKeyPress {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  readonly repeat: boolean;
  readonly isComposing: boolean;
  readonly defaultPrevented: boolean;
}

/** Vertikaler Ausschlag des Rads in Pixeln. */
export function wheelDeltaPixels(deltaY: number, deltaMode: number, pageHeight: number): number {
  if (deltaMode === WHEEL_DELTA_LINE) {
    return deltaY * WHEEL_LINE_PX;
  }
  return deltaMode === WHEEL_DELTA_PAGE ? deltaY * pageHeight : deltaY;
}

/**
 * Zoomrichtung eines Radschritts wie im Mockup: nach unten (`deltaY > 0`) hinaus Richtung Karte,
 * nach oben hinein Richtung Genom. `null`, solange die Sperre läuft oder der Ausschlag zu klein
 * ist. Die Sperre beginnt auch am Ende der Reihe neu, damit ein auslaufender Schwung nicht
 * zurückspringt.
 */
export function wheelZoom(deltaPx: number, nowMs: number, lockedUntilMs: number): WheelZoom | null {
  if (nowMs < lockedUntilMs || Math.abs(deltaPx) < WHEEL_MIN_DELTA) {
    return null;
  }
  return { direction: deltaPx > 0 ? 'out' : 'in', lockedUntilMs: nowMs + WHEEL_LOCK_MS };
}

/**
 * Modus zu einer Taste (W, G, Esc; Groß- und Kleinschreibung egal). `null` für andere Tasten,
 * gehaltene Tasten, mit Strg, Alt oder Meta (Browser- und Systemkürzel), während einer
 * IME-Eingabe und wenn ein anderer Handler die Taste schon verarbeitet hat.
 */
export function shortcutMode(press: ShortcutKeyPress): ShellMode | null {
  if (
    press.ctrlKey ||
    press.altKey ||
    press.metaKey ||
    press.repeat ||
    press.isComposing ||
    press.defaultPrevented
  ) {
    return null;
  }
  const key = press.key.toLowerCase();
  return SHELL_MODES.find((mode) => SHELL_MODE_SHORTCUTS[mode].toLowerCase() === key) ?? null;
}
