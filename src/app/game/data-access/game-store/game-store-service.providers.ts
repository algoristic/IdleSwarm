import { EnvironmentProviders, Provider } from '@angular/core';

import { provideGameSaveService } from '../game-save/game-save-service.providers';
import { GameStoreService } from './game-store.service';

export function provideGameStoreService(): (Provider | EnvironmentProviders)[] {
  return [GameStoreService, ...provideGameSaveService()];
}
