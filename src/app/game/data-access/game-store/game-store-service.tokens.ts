import { InjectionToken } from '@angular/core';

import { DEFAULT_GAME_CONFIG } from '../../domain/data/game-config.data';
import { GameConfig } from '../../domain/models/game-config.model';

export const GAME_CONFIG = new InjectionToken<GameConfig>('GAME_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_GAME_CONFIG,
});
