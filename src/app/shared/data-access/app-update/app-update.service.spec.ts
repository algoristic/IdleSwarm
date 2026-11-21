import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';

import { PAGE_RELOAD } from '../platform/platform.tokens';
import { AppUpdateService } from './app-update.service';

describe('AppUpdateService', () => {
  const reload = vi.fn();

  function create(versionUpdates?: Subject<VersionEvent>): AppUpdateService {
    TestBed.configureTestingModule({
      providers: [
        AppUpdateService,
        { provide: PAGE_RELOAD, useValue: { reload } },
        ...(versionUpdates === undefined
          ? []
          : [{ provide: SwUpdate, useValue: { isEnabled: true, versionUpdates } }]),
      ],
    });
    return TestBed.inject(AppUpdateService);
  }

  const detected: VersionEvent = {
    type: 'VERSION_DETECTED',
    version: { hash: 'neu' },
  };
  const ready: VersionEvent = {
    type: 'VERSION_READY',
    currentVersion: { hash: 'alt' },
    latestVersion: { hash: 'neu' },
  };

  beforeEach(() => reload.mockClear());

  it('meldet ohne Service Worker kein Update', () => {
    expect(create().updateReady()).toBe(false);
  });

  it('meldet ein Update erst, wenn die neue Version bereitliegt, und behält es', () => {
    const updates = new Subject<VersionEvent>();
    const service = create(updates);

    updates.next(detected);
    expect(service.updateReady()).toBe(false);

    updates.next(ready);
    expect(service.updateReady()).toBe(true);

    updates.next({ type: 'VERSION_DETECTED', version: { hash: 'neuer' } });
    expect(service.updateReady()).toBe(true);
  });

  it('lädt über das Plattform-Token neu', () => {
    create().reload();
    expect(reload).toHaveBeenCalledOnce();
  });
});
