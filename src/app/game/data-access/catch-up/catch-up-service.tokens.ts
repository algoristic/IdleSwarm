import { InjectionToken } from '@angular/core';

import { CatchUpWorkerFactory } from './catch-up-service.model';

export const CATCH_UP_WORKER_FACTORY = new InjectionToken<CatchUpWorkerFactory>(
  'CATCH_UP_WORKER_FACTORY',
  {
    providedIn: 'root',
    factory: () => () =>
      typeof Worker !== 'undefined'
        ? new Worker(new URL('./catch-up.worker', import.meta.url), { type: 'module' })
        : null,
  },
);
