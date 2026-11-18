import { InjectionToken } from '@angular/core';

import type { KeyValueStore } from '../../domain/slots-logic';

/** Greift bei jedem Aufruf neu zu, denn schon der Zugriff auf `localStorage` kann werfen. */
export const KEY_VALUE_STORE = new InjectionToken<KeyValueStore>('KEY_VALUE_STORE', {
  providedIn: 'root',
  factory: () => ({
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
    removeItem: (key) => window.localStorage.removeItem(key),
  }),
});
