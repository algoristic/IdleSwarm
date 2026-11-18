import { BalanceParams, DEFAULT_BALANCE } from '../balance/constants';
import { SiteTypeId, START_SITE_TYPE } from '../data/sites-era1';
import { Num } from '../num/num';
import { seedToRngState } from '../rng/rng';

/** Aktuelle Version des Zustandsformats. */
export const STATE_VERSION = 2;

export type Era = 'ursuppe';

/** Zeitangaben in Millisekunden; `now` und `lastSaved` sind Unix-Zeit. */
export interface GameTime {
  readonly now: number;
  readonly lastSaved: number;
  readonly played: number;
}

export interface Resources {
  readonly food: Num;
  readonly dna: Num;
}

export interface Units {
  readonly queens: Num;
  readonly drones: Num;
  readonly soldiers: Num;
}

/** Aktuelle Futterstelle; `stock` liegt immer zwischen 0 und `size`. */
export interface Site {
  readonly type: SiteTypeId;
  readonly size: Num;
  readonly stock: Num;
}

/** Unveränderlicher Spielzustand; Änderungen erzeugen neue Objekte. */
export interface GameState {
  readonly version: number;
  readonly seed: string;
  /** Zustand des seeded RNG (uint32). */
  readonly rngState: number;
  readonly time: GameTime;
  readonly era: Era;
  readonly res: Resources;
  readonly units: Units;
  readonly site: Site;
  /** Manuell gekaufte Einheiten je Typ; Grundlage der Preise, passive Brut zählt nicht. */
  readonly bought: Units;
}

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
