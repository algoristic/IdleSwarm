import { EnvironmentProviders, inject, provideAppInitializer, Provider } from '@angular/core';

import { MotionPreferenceService } from './motion-preference.service';

/** App-weit genau einmal (`app.config.ts`); der Start setzt `data-motion` sofort, auch auf `/modell`. */
export function provideMotionPreferenceService(): (Provider | EnvironmentProviders)[] {
  return [
    MotionPreferenceService,
    provideAppInitializer(() => void inject(MotionPreferenceService)),
  ];
}
