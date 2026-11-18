import { EnvironmentProviders, Provider } from '@angular/core';

import { HudFacade } from './hud.facade';

export function provideHudState(): (Provider | EnvironmentProviders)[] {
  return [HudFacade];
}
