import { inject, InjectionToken, isDevMode } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';

/** Entwicklungs-Build; als Token, damit Tests den Produktiv-Fall prüfen können. */
export const DEV_BUILD = new InjectionToken<boolean>('DEV_BUILD', {
  providedIn: 'root',
  factory: () => isDevMode(),
});

/** Schaltet die Modell-Seite im Produktiv-Build frei (ADR-007, technisches Konzept §5.5). */
export const MODEL_DEV_FLAG = 'dev';

/** Ohne Treffer greift die `**`-Route und leitet auf das HUD um. */
export const modelRouteGuard: CanMatchFn = () =>
  inject(DEV_BUILD) ||
  (inject(Router).currentNavigation()?.extractedUrl.queryParamMap.has(MODEL_DEV_FLAG) ?? false);
