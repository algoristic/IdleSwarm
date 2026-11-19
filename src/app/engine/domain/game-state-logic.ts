import { BalanceParams, DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { clampAutoThreshold, swarmRange } from '@app/balance/domain/formulas';
import { Num } from '@app/shared/util/num/num';
import { seedToRngState } from '@app/shared/util/rng/rng';
import { START_SITE_TYPE } from '@app/site/domain/data/sites-era1.data';
import { generateCandidates } from '@app/site/domain/generator-logic';
import { DEFAULT_STRATEGY } from '@app/site/domain/models/auto-move.model';
import { DEFAULT_TRANSPORT_PRIORITY } from '@app/swarm/domain/models/transport-priority.model';

import { GameState, STATE_VERSION } from './models/game-state.model';

export interface InitialStateOptions {
  readonly seed: string;
  /** Aktuelle Unix-Zeit in Millisekunden; der Kern liest die Uhr nicht selbst. */
  readonly now: number;
  /**
   * RNG-Zustand, mit dem die Erzeugung beginnt; ohne Angabe aus dem Seed abgeleitet. Die Migration
   * eines Spielstands übernimmt so den gespeicherten Zustand (Game-Design §5).
   */
  readonly rngState?: number;
}

/**
 * Erzeugt den Startzustand nach Game-Design §2.1. Die Startkandidaten zieht der Generator aus dem
 * RNG; der zurückgegebene `rngState` ist entsprechend fortgeschrieben.
 */
export function createInitialState(
  { seed, now, rngState = seedToRngState(seed) }: InitialStateOptions,
  params: BalanceParams = DEFAULT_BALANCE,
): GameState {
  const siteSize = Num.from(params.siteSize);
  const origin = { x: 0, y: 0 };
  // Ein neues Spiel hat noch keine Quellen für Effekte, die Reichweite ist also `R_0`.
  const generated = generateCandidates(
    { origin, moves: 0, range: swarmRange(params), rngState },
    params,
  );
  return {
    version: STATE_VERSION,
    seed,
    rngState: generated.rngState,
    time: { now, lastSaved: now, played: 0 },
    era: 'ursuppe',
    res: { food: Num.from(params.startFood), dna: Num.ZERO },
    units: { queens: Num.from(params.startQueens), drones: Num.ZERO, soldiers: Num.ZERO },
    site: { type: START_SITE_TYPE, size: siteSize, stock: siteSize },
    bought: { queens: Num.ZERO, drones: Num.ZERO, soldiers: Num.ZERO },
    map: {
      position: origin,
      candidates: generated.candidates,
      route: [{ type: START_SITE_TYPE, position: { ...origin } }],
      moves: 0,
    },
    travel: null,
    auto: {
      enabled: false,
      strategy: DEFAULT_STRATEGY,
      threshold: clampAutoThreshold(params.defaultAutoThreshold, params),
    },
    priority: DEFAULT_TRANSPORT_PRIORITY,
  };
}
