import { EnvironmentProviders, Provider } from '@angular/core';

import { provideGameLoopService } from '../../data-access/game-loop/game-loop-service.providers';
import { GameFacade } from './game.facade';

export function provideGameState(): (Provider | EnvironmentProviders)[] {
  return [GameFacade, ...provideGameLoopService()];
}
