import { InjectionToken } from '@angular/core';

export type SimWorker = Pick<
  Worker,
  'postMessage' | 'terminate' | 'onmessage' | 'onerror' | 'onmessageerror'
>;

export const SIM_WORKER_FACTORY = new InjectionToken<() => SimWorker>('SIM_WORKER_FACTORY', {
  providedIn: 'root',
  factory: () => () => new Worker(new URL('./sim.worker', import.meta.url), { type: 'module' }),
});
