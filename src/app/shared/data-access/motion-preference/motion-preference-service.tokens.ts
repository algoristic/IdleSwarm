import { InjectionToken } from '@angular/core';

/** Eine Media-Query des Browsers; als Token, damit Tests Treffer und Wechsel ersetzen können. */
export interface MediaQuery {
  matches(): boolean;
  /** Meldet Wechsel des Treffers; die Rückgabe meldet wieder ab. */
  onChange(listener: () => void): () => void;
}

/** Systemeinstellung „Bewegung reduzieren“, `(prefers-reduced-motion: reduce)`. */
export const PREFERS_REDUCED_MOTION = new InjectionToken<MediaQuery>('PREFERS_REDUCED_MOTION', {
  providedIn: 'root',
  factory: () => {
    // jsdom kennt kein `matchMedia`; dann gilt die Systemeinstellung als aus.
    if (typeof matchMedia !== 'function') {
      return { matches: () => false, onChange: () => () => undefined };
    }
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    return {
      matches: () => query.matches,
      onChange: (listener) => {
        query.addEventListener('change', listener);
        return () => query.removeEventListener('change', listener);
      },
    };
  },
});
