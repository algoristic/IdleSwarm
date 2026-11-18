import { inject } from '@angular/core';

import { GameLoopService } from './game-loop.service';
import { PersistenceService } from './persistence.service';

/** Startet das Spiel; läuft im Injection-Kontext des App-Starts. */
export function initGame(): void {
  const persistence = inject(PersistenceService);
  const loop = inject(GameLoopService);
  persistence.restore();
  persistence.startAutosave();
  loop.start();
}
