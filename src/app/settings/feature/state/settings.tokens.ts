import { InjectionToken } from '@angular/core';

import { version } from '../../../../../package.json';

/**
 * Build-Zeitpunkt als Unix-Zeit in Millisekunden; der Produktiv-Build der CI setzt ihn per
 * `ng build --define IDLESWARM_BUILD_TIME=…`. Im Dev-Server und in Tests fehlt er.
 */
declare const IDLESWARM_BUILD_TIME: number | undefined;

/** Version und Build-Zeitpunkt für die Einstellungen (TK §11). */
export interface BuildInfo {
  /** Version aus `package.json`. */
  readonly version: string;
  /** `null` ohne Build-Zeitpunkt (Entwicklung). */
  readonly buildTime: number | null;
}

export const BUILD_INFO = new InjectionToken<BuildInfo>('BUILD_INFO', {
  providedIn: 'root',
  factory: () => ({
    version,
    buildTime:
      typeof IDLESWARM_BUILD_TIME === 'number' && Number.isFinite(IDLESWARM_BUILD_TIME)
        ? IDLESWARM_BUILD_TIME
        : null,
  }),
});
