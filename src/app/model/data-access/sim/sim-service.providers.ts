import { EnvironmentProviders, Provider } from '@angular/core';

import { SimService } from './sim.service';

export function provideSimService(): (Provider | EnvironmentProviders)[] {
  return [SimService];
}
