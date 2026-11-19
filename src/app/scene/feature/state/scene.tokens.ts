import { InjectionToken } from '@angular/core';

/** Anzeige-Eigenschaften des Geräts; als Token, damit Tests sie ersetzen können. */
export interface SceneDisplay {
  /** `devicePixelRatio`; neu gelesen bei jeder Größenänderung. */
  pixelRatio(): number;
  /** Grober Zeiger (Touch), `(pointer: coarse)`. */
  coarsePointer(): boolean;
}

export const SCENE_DISPLAY = new InjectionToken<SceneDisplay>('SCENE_DISPLAY', {
  providedIn: 'root',
  factory: () => ({
    pixelRatio: () => devicePixelRatio,
    // jsdom kennt kein `matchMedia`.
    coarsePointer: () =>
      typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches,
  }),
});
