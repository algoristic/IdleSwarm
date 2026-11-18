import { BalanceParams, DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { Num } from '@app/shared/util/num/num';
import { seedToRngState } from '@app/shared/util/rng/rng';
import { START_SITE_TYPE } from '@app/site/domain/data/sites-era1.data';

import { GameState, STATE_VERSION } from './models/game-state.model';

export interface InitialStateOptions {
  readonly seed: string;
  /** Aktuelle Unix-Zeit in Millisekunden; der Kern liest die Uhr nicht selbst. */
  readonly now: number;
}

/** Erzeugt den Startzustand nach Game-Design §2.1. */
export function createInitialState(
  { seed, now }: InitialStateOptions,
  params: BalanceParams = DEFAULT_BALANCE,
): GameState {
  const siteSize = Num.from(params.siteSize);
  return {
    version: STATE_VERSION,
    seed,
    rngState: seedToRngState(seed),
    time: { now, lastSaved: now, played: 0 },
    era: 'ursuppe',
    res: { food: Num.from(params.startFood), dna: Num.ZERO },
    units: { queens: Num.from(params.startQueens), drones: Num.ZERO, soldiers: Num.ZERO },
    site: { type: START_SITE_TYPE, size: siteSize, stock: siteSize },
    bought: { queens: Num.ZERO, drones: Num.ZERO, soldiers: Num.ZERO },
  };
}
