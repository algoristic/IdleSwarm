import { InjectionToken } from '@angular/core';

import { version } from '../../../../../package.json';

/**
 * Build-Kennung, die der Produktiv-Build der CI per `ng build --define …` setzt (TK §11):
 * Zeitpunkt als Unix-Zeit in Millisekunden, Build-Nummer als Zahl der Commits bis `HEAD`,
 * Commit als Kurz-Hash. Im Dev-Server, in lokalen Builds und in Tests fehlen sie.
 */
declare const IDLESWARM_BUILD_TIME: number | undefined;
declare const IDLESWARM_BUILD_NUMBER: number | undefined;
declare const IDLESWARM_BUILD_COMMIT: string | undefined;

/** Version und Build-Kennung für die Einstellungen (TK §11, Projektplan §6). */
export interface BuildInfo {
  /** Spielerversion aus `package.json`. */
  readonly version: string;
  /** `null` ohne Build-Zeitpunkt (Entwicklung). */
  readonly buildTime: number | null;
  /** Zahl der Commits bis zum gebauten Stand; `null` in der Entwicklung. */
  readonly buildNumber: number | null;
  /** Kurz-Hash des gebauten Commits; `null` in der Entwicklung. */
  readonly commit: string | null;
}

export const BUILD_INFO = new InjectionToken<BuildInfo>('BUILD_INFO', {
  providedIn: 'root',
  factory: () => ({
    version,
    buildTime:
      typeof IDLESWARM_BUILD_TIME === 'number' && Number.isFinite(IDLESWARM_BUILD_TIME)
        ? IDLESWARM_BUILD_TIME
        : null,
    buildNumber:
      typeof IDLESWARM_BUILD_NUMBER === 'number' && Number.isInteger(IDLESWARM_BUILD_NUMBER)
        ? IDLESWARM_BUILD_NUMBER
        : null,
    commit:
      typeof IDLESWARM_BUILD_COMMIT === 'string' && IDLESWARM_BUILD_COMMIT !== ''
        ? IDLESWARM_BUILD_COMMIT
        : null,
  }),
});
