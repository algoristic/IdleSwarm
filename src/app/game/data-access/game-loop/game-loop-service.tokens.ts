import { DOCUMENT, inject, InjectionToken } from '@angular/core';

import { FrameScheduler, PageVisibility } from './game-loop-service.model';

export const FRAME_SCHEDULER = new InjectionToken<FrameScheduler>('FRAME_SCHEDULER', {
  providedIn: 'root',
  factory: () => {
    const view = inject(DOCUMENT).defaultView;
    return {
      request: (callback) => view?.requestAnimationFrame(callback) ?? 0,
      cancel: (handle) => view?.cancelAnimationFrame(handle),
    };
  },
});

export const MONOTONIC_NOW = new InjectionToken<() => number>('MONOTONIC_NOW', {
  providedIn: 'root',
  factory: () => {
    const performance = inject(DOCUMENT).defaultView?.performance;
    return () => performance?.now() ?? 0;
  },
});

export const PAGE_VISIBILITY = new InjectionToken<PageVisibility>('PAGE_VISIBILITY', {
  providedIn: 'root',
  factory: () => {
    const doc = inject(DOCUMENT);
    const listen = (target: EventTarget | null, type: string, listener: () => void) => {
      target?.addEventListener(type, listener);
      return (): void => target?.removeEventListener(type, listener);
    };
    return {
      isHidden: () => doc.hidden,
      onVisibilityChange: (listener) => listen(doc, 'visibilitychange', listener),
      onPageHide: (listener) => listen(doc.defaultView, 'pagehide', listener),
    };
  },
});
