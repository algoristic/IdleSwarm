import { Num } from '../num/num';
import { seedToRngState } from '../rng/rng';

/** Aktuelle Version des Zustandsformats. */
export const STATE_VERSION = 1;

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
}

export interface InitialStateOptions {
  readonly seed: string;
  /** Aktuelle Unix-Zeit in Millisekunden; der Kern liest die Uhr nicht selbst. */
  readonly now: number;
}

/** Erzeugt den Startzustand; alle Mengen sind neutrale Platzhalter (`Num.ZERO`). */
export function createInitialState({ seed, now }: InitialStateOptions): GameState {
  return {
    version: STATE_VERSION,
    seed,
    rngState: seedToRngState(seed),
    time: { now, lastSaved: now, played: 0 },
    era: 'ursuppe',
    res: { food: Num.ZERO, dna: Num.ZERO },
    units: { queens: Num.ZERO, drones: Num.ZERO, soldiers: Num.ZERO },
  };
}
