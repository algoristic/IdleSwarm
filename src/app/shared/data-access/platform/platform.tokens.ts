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
