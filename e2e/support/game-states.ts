import { Page } from '@playwright/test';

import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { apply } from '@app/engine/domain/commands-logic';
import { GameState } from '@app/engine/domain/models/game-state.model';
import { stateModifiers } from '@app/engine/domain/modifiers-logic';
import { runSimulationWithState } from '@app/engine/domain/runner-logic';
import { step } from '@app/engine/domain/step-logic';
import { createActiveBot } from '@app/model/domain/bots/active-bot-logic';
import { HINT_IDS, ONBOARDING_UNLOCK_IDS } from '@app/onboarding/domain/models/onboarding.model';
import { encodeSave } from '@app/persistence/domain/serialize-logic';
import { SAVE_KEY } from '@app/persistence/domain/slots-logic';
import { MS_PER_HOUR } from '@app/shared/util/time/time-units';
import { canDepart } from '@app/site/domain/move-logic';

/** Fester Seed, damit jeder Lauf denselben Stand erzeugt. */
const SEED = 'e2e-smoke';

/** Gespielte Zeit des aktiven Bots; danach sind Karte, Funde und Genom erreicht. */
const PLAYED_MS = 2 * MS_PER_HOUR;

export interface AdvancedGame {
  /** Spielstand wie im localStorage (`encodeSave`). */
  readonly save: string;
  /** Index eines Ziels, zu dem der Schwarm aufbrechen kann. */
  readonly departTarget: number;
}

/**
 * Fortgeschrittener Stand aus den echten Domänenfunktionen: Der aktive Bot der Modell-Seite spielt
 * {@link PLAYED_MS}; danach ist das Auto-Weiterziehen aus, eine laufende Reise beendet, alles
 * freigeschaltet und jeder Hinweis gesehen. `lastSaved` liegt `awayMs` vor `nowMs`.
 */
export function advancedGame(nowMs: number, awayMs = 0): AdvancedGame {
  const params = DEFAULT_BALANCE;
  simulated ??= simulate();
  const state: GameState = {
    ...simulated,
    onboarding: { unlocked: [...ONBOARDING_UNLOCK_IDS], seenHints: [...HINT_IDS] },
    time: { ...simulated.time, now: nowMs, lastSaved: nowMs - awayMs },
  };
  const modifiers = stateModifiers(state, params);
  const departTarget = state.map.candidates.findIndex((_candidate, index) =>
    canDepart(state, index, params, modifiers),
  );
  if (departTarget < 0) {
    throw new Error('advancedGame: kein erreichbares Ziel im erzeugten Stand');
  }
  return { save: encodeSave(state), departTarget };
}

/** Lauf des Bots, je Worker einmal gerechnet. */
let simulated: GameState | undefined;

function simulate(): GameState {
  const params = DEFAULT_BALANCE;
  let state = runSimulationWithState({
    seed: SEED,
    bot: createActiveBot(),
    durationMs: PLAYED_MS,
    sampleEveryMs: MS_PER_HOUR,
  }).state;
  state = apply(state, { type: 'setAutoMove', enabled: false }, params);
  if (state.travel !== null) {
    state = step(state, state.travel.remainingMs, params).state;
  }
  return state;
}

/** Legt `save` vor dem ersten Laden der Seite als Primär-Stand in den localStorage. */
export async function seedSave(page: Page, save: string): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      // Nur beim ersten Laden, damit ein Neuladen im Test den gespeicherten Fortschritt behält.
      if (window.sessionStorage.getItem('e2e.seeded') === null) {
        window.localStorage.setItem(key, value);
        window.sessionStorage.setItem('e2e.seeded', '1');
      }
    },
    { key: SAVE_KEY, value: save },
  );
}
