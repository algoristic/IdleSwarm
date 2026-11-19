import { seedToRngState } from '@app/shared/util/rng/rng';

import type { Finds } from './models/finds.model';

/**
 * Zusatz zum Seed für den eigenen Fund-RNG (Game-Design §4.16). Ohne ihn begänne der Fund-Strom
 * beim selben Zustand wie der Generator und wiederholte dessen Zufallsfolge. Spielstände hängen
 * davon ab; der Wert darf sich nicht ändern.
 */
const FINDS_SEED_SUFFIX = '#finds';

/** Startzustand des Fund-RNG, abgeleitet aus dem Seed (Game-Design §4.16, §5.1). */
export function findsRngState(seed: string): number {
  return seedToRngState(`${seed}${FINDS_SEED_SUFFIX}`);
}

/** Fundzustand eines neuen Spiels: Zähler 0, nichts gesammelt, keine Buffs (Game-Design §2.1). */
export function initialFinds(seed: string): Finds {
  return { rngState: findsRngState(seed), total: 0, collected: {}, buffs: [] };
}
