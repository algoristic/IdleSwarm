import { DOCUMENT, inject, InjectionToken } from '@angular/core';

import { SaveStorage } from './game-save-service.model';

export const SAVE_STORAGE = new InjectionToken<SaveStorage | null>('SAVE_STORAGE', {
  providedIn: 'root',
  factory: () => {
    try {
      return inject(DOCUMENT).defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  },
});

export const WALL_CLOCK_NOW = new InjectionToken<() => number>('WALL_CLOCK_NOW', {
  providedIn: 'root',
  factory: () => () => Date.now(),
});

export const NEW_GAME_SEED = new InjectionToken<() => number>('NEW_GAME_SEED', {
  providedIn: 'root',
  factory: () => () => (Math.random() * 2 ** 31) | 0,
});
