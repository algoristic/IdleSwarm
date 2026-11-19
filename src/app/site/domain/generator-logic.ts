import type { BalanceParams } from '@app/balance/domain/constants';
import {
  candidateDefense,
  candidateDistance,
  candidateSize,
  isWithinRange,
  positionAt,
  siteTypeWeight,
  spreadFactor,
  weightedIndex,
} from '@app/balance/domain/formulas';
import { Num } from '@app/shared/util/num/num';
import { nextRandom } from '@app/shared/util/rng/rng';

import { SAFE_SITE_TYPE, SITE_TYPE_IDS, SiteTypeId } from './data/sites-era1.data';
import type { Position, SiteCandidate } from './models/map.model';

export interface GeneratorInput {
  /** Aktuelle Position `P`. */
  readonly origin: Position;
  /** Zugzähler `z`. */
  readonly moves: number;
  /** Reichweite zum Zeitpunkt der Erzeugung. */
  readonly range: number;
  /** RNG-Zustand des Spielzustands (uint32). */
  readonly rngState: number;
}

export interface GeneratorResult {
  readonly candidates: readonly SiteCandidate[];
  /** Fortgeschriebener RNG-Zustand; immer um `5 · k` Ziehungen weiter. */
  readonly rngState: number;
}

/** Gezogene Werte eines Kandidaten, bevor die Garantie greift. */
interface Draft {
  readonly type: SiteTypeId;
  readonly angle: number;
  readonly distance: number;
  readonly sizeSpread: number;
  readonly defenseSpread: number;
}

const FULL_TURN = 2 * Math.PI;

/** Ganzzahlige Kandidatenzahl `k`; überschriebene Bruchwerte werden abgerundet. */
function candidateCount(params: BalanceParams): number {
  return Math.max(0, Math.floor(params.candidateCount));
}

function drawDrafts(
  count: number,
  rngState: number,
  params: BalanceParams,
): {
  drafts: Draft[];
  rngState: number;
} {
  const weights = SITE_TYPE_IDS.map((type) => siteTypeWeight(type, params));
  let state = rngState;
  const draw = (): number => {
    const result = nextRandom(state);
    state = result.rngState;
    return result.value;
  };
  const drafts: Draft[] = [];
  for (let i = 0; i < count; i++) {
    // Genau fünf Ziehungen je Kandidat, in dieser Reihenfolge (Game-Design §4.6).
    const type = SITE_TYPE_IDS[weightedIndex(draw(), weights)];
    const angle = FULL_TURN * draw();
    const distance = candidateDistance(draw(), params);
    const sizeSpread = spreadFactor(draw(), params);
    const defenseSpread = spreadFactor(draw(), params);
    drafts.push({ type, angle, distance, sizeSpread, defenseSpread });
  }
  return { drafts, rngState: state };
}

/** Index des nächstgelegenen Entwurfs unter `indices`; bei gleicher Distanz der kleinere Index. */
function nearest(drafts: readonly Draft[], indices: readonly number[]): number {
  return indices.reduce((best, i) => (drafts[i].distance < drafts[best].distance ? i : best));
}

function toCandidate(
  draft: Draft,
  { origin, moves }: GeneratorInput,
  params: BalanceParams,
): SiteCandidate {
  const { type, angle, distance, sizeSpread, defenseSpread } = draft;
  return {
    type,
    position: positionAt(origin, distance, angle),
    size: candidateSize(type, distance, moves, sizeSpread, params),
    defense: candidateDefense(type, distance, moves, defenseSpread, params),
  };
}

/**
 * Garantie einer sicheren Futterstelle (Game-Design §4.6, US-04.02): Liegt keine Algenmatte mit
 * Abwehr 0 in Reichweite, wird genau ein Kandidat zur Algenmatte mit Abwehr 0. Ersetzt wird der
 * nächstgelegene in Reichweite, sonst der nächstgelegene überhaupt, dessen Distanz dann `R` wird.
 */
function applyGuarantee(
  drafts: readonly Draft[],
  candidates: readonly SiteCandidate[],
  input: GeneratorInput,
  params: BalanceParams,
): readonly SiteCandidate[] {
  const { range } = input;
  const inRange = drafts.flatMap((draft, i) => (isWithinRange(draft.distance, range) ? [i] : []));
  const hasSafe = inRange.some(
    (i) => candidates[i].type === SAFE_SITE_TYPE && candidates[i].defense.isZero(),
  );
  if (drafts.length === 0 || hasSafe) {
    return candidates;
  }
  const index =
    inRange.length > 0
      ? nearest(drafts, inRange)
      : nearest(
          drafts,
          drafts.map((_draft, i) => i),
        );
  const draft = drafts[index];
  const replacement: Draft = {
    ...draft,
    type: SAFE_SITE_TYPE,
    distance: inRange.length > 0 ? draft.distance : range,
  };
  const result = [...candidates];
  result[index] = { ...toCandidate(replacement, input, params), defense: Num.ZERO };
  return result;
}

/**
 * Erzeugt `k` Kandidaten um `origin` (Game-Design §4.6). Rein und deterministisch: Gleicher
 * RNG-Zustand, gleiches `z` und gleiche Reichweite ergeben dieselben Kandidaten.
 */
export function generateCandidates(input: GeneratorInput, params: BalanceParams): GeneratorResult {
  const { drafts, rngState } = drawDrafts(candidateCount(params), input.rngState, params);
  const candidates = drafts.map((draft) => toCandidate(draft, input, params));
  return { candidates: applyGuarantee(drafts, candidates, input, params), rngState };
}
