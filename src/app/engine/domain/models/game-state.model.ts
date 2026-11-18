import type { Num } from '@app/shared/util/num/num';
import type { Site } from '@app/site/domain/models/site.model';
import type { Units } from '@app/swarm/domain/models/units.model';

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
