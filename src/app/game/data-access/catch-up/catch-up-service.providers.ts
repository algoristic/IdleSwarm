import { EnvironmentProviders, Provider } from '@angular/core';

import { CatchUpService } from './catch-up.service';

export function provideCatchUpService(): (Provider | EnvironmentProviders)[] {
  return [CatchUpService];
}
