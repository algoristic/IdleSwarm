import type { BalanceParams } from '@app/balance/domain/constants';
import {
  candidateStatus,
  distanceBetween,
  dnaReward,
  siteFindChance,
  travelDurationMs,
} from '@app/balance/domain/formulas';
import type { Num } from '@app/shared/util/num/num';

import type { CandidateStatus, Position, SiteCandidate } from './models/map.model';

/** Abgeleitete Werte eines Kandidaten (Game-Design §4.5, §4.7); werden nicht gespeichert. */
export interface CandidateInfo {
  readonly distance: number;
  readonly status: CandidateStatus;
  readonly dna: Num;
  readonly findChance: number;
  readonly travelMs: number;
}

/**
 * Leitet Distanz, Status und Werte eines Kandidaten aus der aktuellen Position und Reichweite ab.
 * Steigt die Reichweite, ändert sich der Status sofort (US-04.03).
 */
export function candidateInfo(
  candidate: SiteCandidate,
  position: Position,
  range: number,
  params: BalanceParams,
): CandidateInfo {
  const distance = distanceBetween(position, candidate.position);
  return {
    distance,
    status: candidateStatus(distance, range, params),
    dna: dnaReward(candidate.defense, params),
    findChance: siteFindChance(candidate.type, params),
    travelMs: travelDurationMs(distance, params),
  };
}

/** Werte aller Kandidaten in der Reihenfolge der Kandidatenliste. */
export function candidateInfos(
  candidates: readonly SiteCandidate[],
  position: Position,
  range: number,
  params: BalanceParams,
): readonly CandidateInfo[] {
  return candidates.map((candidate) => candidateInfo(candidate, position, range, params));
}
