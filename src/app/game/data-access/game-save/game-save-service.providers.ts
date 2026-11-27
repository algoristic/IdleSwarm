import { EnvironmentProviders, Provider } from '@angular/core';

import { GameSaveService } from './game-save.service';

export function provideGameSaveService(): (Provider | EnvironmentProviders)[] {
  return [GameSaveService];
}
