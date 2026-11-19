import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { provideGameCore } from '@app/engine/data-access/game-core/game-core.providers';
import { provideMotionPreferenceService } from '@app/shared/data-access/motion-preference/motion-preference-service.providers';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideGameCore(),
    provideMotionPreferenceService(),
  ],
};
