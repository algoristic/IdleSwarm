/**
 * Gespeicherte Pheromon-Verteilung (Game-Design §4.15, §5.1), alle Werte ganzzahlig. `P_ges`,
 * `P_frei`, der Brutfaktor und der Drohnenanteil sind abgeleitet.
 */
export interface Pheromones {
  /** Verteilte Punkte auf Drohnen `P_d`. */
  readonly drones: number;
  /** Verteilte Punkte auf Soldaten `P_s`. */
  readonly soldiers: number;
  /** Gekaufte Drüsenpunkte `k`. */
  readonly glands: number;
}
