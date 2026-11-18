import { EnvironmentProviders, inject, provideAppInitializer, Provider } from '@angular/core';

import { PersistenceService } from '@app/persistence/data-access/persistence/persistence.service';

import { GameLoop } from '../game-loop/game-loop.service';
import { GameStore } from '../game-store/game-store.service';

/** Startet das Spiel; läuft im Injection-Kontext des App-Starts. */
export function initGame(): void {
  const persistence = inject(PersistenceService);
  const loop = inject(GameLoop);
  persistence.restore();
  persistence.startAutosave();
  loop.start();
}

/** Spielkern: genau ein Zustand, ein Takt und ein Autosave für die ganze App (CLAUDE.md §6). */
export function provideGameCore(): (Provider | EnvironmentProviders)[] {
  return [GameStore, GameLoop, PersistenceService, provideAppInitializer(initGame)];
}
