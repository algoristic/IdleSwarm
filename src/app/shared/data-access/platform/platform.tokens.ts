import { InjectionToken } from '@angular/core';

/** Uhren des Browsers; als Token, damit Tests die Zeit ersetzen können. */
export interface Clock {
  /** Unix-Zeit in Millisekunden (`Date.now`). */
  now(): number;
  /** Monotone Zeit in Millisekunden für Abstände (`performance.now`). */
  monotonic(): number;
}

// Die Defaults lesen die Globals bei jedem Aufruf, damit Fake-Timer und Spies in Tests greifen.
export const CLOCK = new InjectionToken<Clock>('CLOCK', {
  providedIn: 'root',
  factory: () => ({
    now: () => Date.now(),
    monotonic: () => performance.now(),
  }),
});

export interface AnimationFrame {
  request(callback: FrameRequestCallback): number;
  cancel(handle: number): void;
}

export const ANIMATION_FRAME = new InjectionToken<AnimationFrame>('ANIMATION_FRAME', {
  providedIn: 'root',
  factory: () => ({
    request: (callback) => requestAnimationFrame(callback),
    cancel: (handle) => cancelAnimationFrame(handle),
  }),
});

/** Größe des Browserfensters; als Token, damit Tests Größe und `resize` ersetzen können. */
export interface Viewport {
  /** Breite in CSS-Pixeln (`innerWidth`). */
  width(): number;
  /** Höhe in CSS-Pixeln (`innerHeight`). */
  height(): number;
  /** Meldet Größenänderungen; die Rückgabe meldet wieder ab. */
  onResize(listener: () => void): () => void;
}

export const VIEWPORT = new InjectionToken<Viewport>('VIEWPORT', {
  providedIn: 'root',
  factory: () => ({
    width: () => innerWidth,
    height: () => innerHeight,
    onResize: (listener) => {
      addEventListener('resize', listener);
      return () => removeEventListener('resize', listener);
    },
  }),
});

/** Zwischenablage; als Token, damit Tests Erfolg und Fehlschlag ersetzen können. */
export interface Clipboard {
  /** Schreibt Text; scheitert ohne Zwischenablage oder ohne Berechtigung (Promise abgelehnt). */
  writeText(text: string): Promise<void>;
}

export const CLIPBOARD = new InjectionToken<Clipboard>('CLIPBOARD', {
  providedIn: 'root',
  factory: () => ({
    writeText: async (text) => {
      // Ohne sicheren Kontext (http) gibt es `navigator.clipboard` nicht.
      if (typeof navigator === 'undefined' || navigator.clipboard === undefined) {
        throw new Error('Keine Zwischenablage');
      }
      await navigator.clipboard.writeText(text);
    },
  }),
});
