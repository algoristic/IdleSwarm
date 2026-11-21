import type { Finds } from '@app/finds/domain/models/finds.model';
import type { Genome } from '@app/genome/domain/models/genome.model';
import type { Onboarding } from '@app/onboarding/domain/models/onboarding.model';
import type { Settings } from '@app/settings/domain/models/settings.model';
import type { Num } from '@app/shared/util/num/num';
import type { AutoMove } from '@app/site/domain/models/auto-move.model';
import type { SiteMap } from '@app/site/domain/models/map.model';
import type { Site } from '@app/site/domain/models/site.model';
import type { Travel } from '@app/site/domain/models/travel.model';
import type { Pheromones } from '@app/swarm/domain/models/pheromones.model';
import type { TransportPriority } from '@app/swarm/domain/models/transport-priority.model';
import type { Units } from '@app/swarm/domain/models/units.model';

/** Aktuelle Version des Zustandsformats. */
export const STATE_VERSION = 5;

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
  /** Position, Kandidaten, Route und Zugzähler (Game-Design §4.6, §5). */
  readonly map: SiteMap;
  /** `null`, solange der Schwarm nicht unterwegs ist. */
  readonly travel: Travel | null;
  /** Spielereinstellungen des Auto-Weiterziehens. */
  readonly auto: AutoMove;
  /** Mitnahme-Priorität beim Aufbruch (Spielereinstellung). */
  readonly priority: TransportPriority;
  /** Verteilte Pheromonpunkte und gekaufte Drüsenpunkte (Game-Design §4.15). */
  readonly pheromones: Pheromones;
  /** Entwickelte reguläre Adaptionen (Game-Design §4.14). */
  readonly genome: Genome;
  /** Fund-RNG, Fundzähler, Sammlung und Buffs (Game-Design §4.16). */
  readonly finds: Finds;
  /** Spielereinstellungen: Zahlenformat, Animationen, Autosave-Intervall (US-09.01). */
  readonly settings: Settings;
  /** Freigeschaltete Teile der Oberfläche und gesehene Hinweise (US-09.04, Game-Design §4.18). */
  readonly onboarding: Onboarding;
}
