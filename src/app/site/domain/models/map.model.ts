import type { Num } from '@app/shared/util/num/num';

import type { SiteTypeId } from '../data/sites-era1.data';

/** Technische Grenze der gespeicherten Route: nur die letzten Punkte bleiben (Game-Design §5). */
export const ROUTE_MAX_POINTS = 50;

/** Punkt in der Ebene, gemessen in Distanzeinheiten. */
export interface Position {
  readonly x: number;
  readonly y: number;
}

/**
 * Erzeugtes Ziel (Game-Design §4.6). Gespeichert werden nur Typ, Position, Größe und Abwehr; Distanz,
 * Status, DNA und Fundchance sind abgeleitet.
 */
export interface SiteCandidate {
  readonly type: SiteTypeId;
  readonly position: Position;
  /** Voller Vorrat bei Ankunft, ungerundet. */
  readonly size: Num;
  /** Ganzzahlig; `Num`, weil die Abwehr mit `γ_B^z` wächst und mit dem Angriff (`Num`) verglichen wird. */
  readonly defense: Num;
}

/** Besuchte Futterstelle auf der Route. */
export interface RoutePoint {
  readonly type: SiteTypeId;
  readonly position: Position;
}

export interface SiteMap {
  readonly position: Position;
  readonly candidates: readonly SiteCandidate[];
  /** Ab der Startfutterstelle, höchstens {@link ROUTE_MAX_POINTS} Punkte. */
  readonly route: readonly RoutePoint[];
  /** Zugzähler `z`: Zahl der bisherigen Weiterzüge. */
  readonly moves: number;
}

/** Status eines Kandidaten (Game-Design §4.7); wird abgeleitet, nicht gespeichert. */
export const CANDIDATE_STATUSES = ['in-range', 'out-of-range', 'unexplored'] as const;

export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];
