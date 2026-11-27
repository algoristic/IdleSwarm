import { EnvironmentProviders, Provider } from '@angular/core';

import { provideCatchUpService } from '../catch-up/catch-up-service.providers';
import { provideGameStoreService } from '../game-store/game-store-service.providers';
import { GameLoopService } from './game-loop.service';

export function provideGameLoopService(): (Provider | EnvironmentProviders)[] {
  return [GameLoopService, ...provideGameStoreService(), ...provideCatchUpService()];
}
