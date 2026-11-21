import { EnvironmentProviders, Provider } from '@angular/core';

import { AppUpdateService } from './app-update.service';

export function provideAppUpdateService(): (Provider | EnvironmentProviders)[] {
  return [AppUpdateService];
}
