import { EnvironmentProviders, Provider } from '@angular/core';

import { provideGameStoreService } from '../game-store/game-store-service.providers';
import { GameLoopService } from './game-loop.service';

export function provideGameLoopService(): (Provider | EnvironmentProviders)[] {
  return [GameLoopService, ...provideGameStoreService()];
}
