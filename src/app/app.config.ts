import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { provideGameCore } from '@app/engine/data-access/game-core/game-core.providers';
import { provideAppliedSettings } from '@app/settings/feature/state/settings.providers';
import { provideMotionPreferenceService } from '@app/shared/data-access/motion-preference/motion-preference-service.providers';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideGameCore(),
    provideMotionPreferenceService(),
    provideAppliedSettings(),
    // PWA (ADR-015): nur im Produktions-Build; registriert, sobald die App stabil ist, spätestens
    // nach 30 s, damit der Vorab-Cache den Start nicht bremst.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
