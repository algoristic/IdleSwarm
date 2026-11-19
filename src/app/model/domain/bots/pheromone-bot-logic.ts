import { distributedPheromonePoints } from '@app/balance/domain/formulas';
import type { CommandPlan } from '@app/engine/domain/bot-logic';

/** Verteilung `P_d : P_s` der Pheromonpunkte. */
export interface PheromoneSplit {
  readonly drones: number;
  readonly soldiers: number;
}

/**
 * Ganzzahlige Aufteilung von `points`, deren Drohnenanteil `a = P_d / points` dem Zielanteil
 * `targetShare` am nächsten liegt; bei Gleichstand mehr Drohnen (Game-Design §6.3).
 * `|P_d / n − a*|` ist minimal, wo `|P_d − a* · n|` minimal ist, also bei der nächsten ganzen Zahl.
 */
export function closestSplit(points: number, targetShare: number): PheromoneSplit {
  const ideal = targetShare * points;
  const lower = Math.max(0, Math.min(points, Math.floor(ideal)));
  const upper = Math.min(points, lower + 1);
  const drones = ideal - lower < upper - ideal ? lower : upper;
  return { drones, soldiers: points - drones };
}

/**
 * Ein freier Punkt geht auf den Typ, der `|a − a*|` kleiner macht, bei Gleichstand auf Drohnen
 * (Game-Design §6.3). Verglichen wird `|P_d − a* · n|` statt der Anteile, damit ein Gleichstand
 * nicht an Rundungsfehlern der Division scheitert.
 */
function addPoint(split: PheromoneSplit, targetShare: number): PheromoneSplit {
  const ideal = targetShare * (split.drones + split.soldiers + 1);
  const toDrones = Math.abs(split.drones + 1 - ideal);
  const toSoldiers = Math.abs(split.drones - ideal);
  return toDrones <= toSoldiers
    ? { drones: split.drones + 1, soldiers: split.soldiers }
    : { drones: split.drones, soldiers: split.soldiers + 1 };
}

/**
 * Verteilung nach Game-Design §6.3: Weicht die Verteilung von der nächsten ganzzahligen Aufteilung
 * von `P_v` ab (nur bei der ersten Entscheidung eines neuen Spiels, danach hält der Bot sie), setzt
 * er diese; danach verteilt er jeden freien Punkt einzeln. Gesetzt wird nur bei Änderung.
 */
export function distributePheromones(plan: CommandPlan, targetShare: number): void {
  const { pheromones } = plan.state;
  const distributed = distributedPheromonePoints(pheromones);
  let split = closestSplit(distributed, targetShare);
  for (let free = plan.view.pheromonePoints - distributed; free > 0; free--) {
    split = addPoint(split, targetShare);
  }
  plan.setPheromones(split.drones, split.soldiers);
}
