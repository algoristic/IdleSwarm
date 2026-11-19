import { EnvironmentProviders, Provider } from '@angular/core';

import { SceneFacade } from './scene.facade';

export function provideSceneState(): (Provider | EnvironmentProviders)[] {
  return [SceneFacade];
}
