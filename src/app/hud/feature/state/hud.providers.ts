import { EnvironmentProviders, Provider } from '@angular/core';

import { provideAppUpdateService } from '@app/shared/data-access/app-update/app-update-service.providers';

import { HudFacade } from './hud.facade';

export function provideHudState(): (Provider | EnvironmentProviders)[] {
  return [HudFacade, provideAppUpdateService()];
}
