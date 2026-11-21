import { InjectionToken, Signal, signal } from '@angular/core';

import { DEFAULT_NOTATION, Notation } from '../../../util/format/format';

/**
 * Eingestellte Notation großer Zahlen für die Pipes `formatNum`, `formatRate`, `formatDown` und
 * `formatUp`. Der Root-Default bleibt bei Kurzformen (Modell-Seite); die Shell stellt das
 * Zahlenformat aus dem Spielstand bereit (`provideSettingsState`).
 */
export const NUMBER_NOTATION = new InjectionToken<Signal<Notation>>('NUMBER_NOTATION', {
  providedIn: 'root',
  factory: () => signal(DEFAULT_NOTATION).asReadonly(),
});
