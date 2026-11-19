import { EnvironmentProviders, Provider } from '@angular/core';

import { SonarFacade } from './sonar.facade';

export function provideSonarState(): (Provider | EnvironmentProviders)[] {
  return [SonarFacade];
}
