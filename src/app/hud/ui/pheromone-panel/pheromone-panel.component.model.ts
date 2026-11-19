import type { Num } from '@app/shared/util/num/num';
import type { Pheromones } from '@app/swarm/domain/models/pheromones.model';

/** Einheitentypen, auf die Pheromonpunkte verteilt werden (Game-Design §4.15). */
export type PheromoneUnit = 'drones' | 'soldiers';

/** Verteilung, die ein Knopf mit `setPheromones` setzt. */
export type PheromoneDistribution = Pick<Pheromones, PheromoneUnit>;

export interface PheromoneRowView {
  readonly id: PheromoneUnit;
  readonly points: number;
  /** Verteilung nach „+“; `null`, wenn kein freier Punkt da ist. */
  readonly increase: PheromoneDistribution | null;
  /** Verteilung nach „−“; `null` ohne Punkte auf diesem Typ. */
  readonly decrease: PheromoneDistribution | null;
}

export interface GlandView {
  /** Preis auf Anzeigegenauigkeit; bei einem kaufbaren Knopf nie über der angezeigten Nahrung. */
  readonly price: Num;
  readonly affordable: boolean;
  /** Eier/min, die ein weiterer Punkt bringt, sobald er verteilt ist (`eggsPerPheromonePoint`). */
  readonly eggsPerPoint: Num;
}

export interface PheromoneView {
  readonly total: number;
  readonly distributed: number;
  readonly free: number;
  /** Drohnen, dann Soldaten. */
  readonly rows: readonly PheromoneRowView[];
  /** Ganze Prozent; zusammen 100, ohne verteilte Punkte beide 0. */
  readonly dronePercent: number;
  readonly soldierPercent: number;
  readonly gland: GlandView;
}
