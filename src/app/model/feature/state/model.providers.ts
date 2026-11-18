import { EnvironmentProviders, Provider } from '@angular/core';

import { provideSimService } from '../../data-access/sim/sim-service.providers';
import { ModelFacade } from './model.facade';

export function provideModelState(): (Provider | EnvironmentProviders)[] {
  return [provideSimService(), ModelFacade];
}
