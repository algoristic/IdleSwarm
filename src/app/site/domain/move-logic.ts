import type { BalanceParams } from '@app/balance/domain/constants';
import { swarmRange } from '@app/balance/domain/formulas';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import { Num } from '@app/shared/util/num/num';
import { planTransport } from '@app/swarm/domain/transport-logic';

import { assessCombat, assessTarget } from './combat-logic';
import { generateCandidates } from './generator-logic';
import { candidateInfo } from './map-logic';
import { ROUTE_MAX_POINTS } from './models/map.model';
import type { SiteResult } from './models/site-event.model';

/** Gründe, aus denen kein Aufbruch möglich ist (Game-Design §4.11); Codes für die Oberfläche. */
export const DEPARTURE_BLOCKERS = [
  'traveling',
  'unknown-target',
  'out-of-range',
  'too-strong',
] as const;

export type DepartureBlocker = (typeof DEPARTURE_BLOCKERS)[number];

const NO_EVENTS: SiteResult['events'] = Object.freeze([]);

/**
 * Warum der Schwarm nicht zum Kandidaten `target` (Index in `map.candidates`) aufbrechen kann;
 * `null`, wenn der Aufbruch möglich ist: keine Reise, Ziel in Reichweite, `A' ≥ B`.
 */
export function departureBlocker(
  state: GameState,
  target: number,
  params: BalanceParams,
): DepartureBlocker | null {
  const { candidates, position } = state.map;
  if (state.travel !== null) {
    return 'traveling';
  }
  if (!Number.isInteger(target) || target < 0 || target >= candidates.length) {
    return 'unknown-target';
  }
  const candidate = candidates[target];
  if (candidateInfo(candidate, position, swarmRange(params), params).status !== 'in-range') {
    return 'out-of-range';
  }
  return assessTarget(state, candidate, params).capturable ? null : 'too-strong';
}

export function canDepart(state: GameState, target: number, params: BalanceParams): boolean {
  return departureBlocker(state, target, params) === null;
}

/**
 * Aufbruch zum Kandidaten `target` (Game-Design §4.11): Transport, Restvorrat verfällt, Reise mit
 * `d · t_r`. Ist der Aufbruch nicht möglich, kommt derselbe Zustand ohne Ereignis zurück.
 */
export function depart(
  state: GameState,
  target: number,
  auto: boolean,
  params: BalanceParams,
): SiteResult {
  if (!canDepart(state, target, params)) {
    return { state, events: NO_EVENTS };
  }
  const { map, site, units, priority } = state;
  const candidate = map.candidates[target];
  const { distance, travelMs } = candidateInfo(candidate, map.position, swarmRange(params), params);
  const { carried, leftBehind } = planTransport(units, priority, params);
  return {
    state: {
      ...state,
      units: carried,
      site: { ...site, stock: Num.ZERO },
      travel: { target: candidate, remainingMs: travelMs },
    },
    events: [
      {
        type: 'departed',
        playedMs: state.time.played,
        siteType: candidate.type,
        distance,
        leftBehind: { drones: leftBehind.drones, soldiers: leftBehind.soldiers },
        forfeitedStock: site.stock,
        auto,
      },
    ],
  };
}

/**
 * Ankunft am Reiseziel (Game-Design §4.11): Kampf mit den vorhandenen Soldaten, DNA, neue
 * Futterstelle mit vollem Vorrat, Route, `z + 1` und neue Kandidaten um die neue Position. Das
 * Ereignis trägt die Spielzeit des Zustands. Ohne Reise kommt derselbe Zustand zurück.
 */
export function arrive(state: GameState, params: BalanceParams): SiteResult {
  const { travel, map, res, units } = state;
  if (travel === null) {
    return { state, events: NO_EVENTS };
  }
  const { target } = travel;
  // Dieselbe Rechnung wie `applyCapture`; der Verlust ist auf die vorhandenen Soldaten begrenzt.
  const combat = assessCombat(units.soldiers, target.defense, params);
  const losses = combat.losses.min(units.soldiers);
  const moves = map.moves + 1;
  const position = { ...target.position };
  const generated = generateCandidates(
    { origin: position, moves, range: swarmRange(params), rngState: state.rngState },
    params,
  );
  return {
    state: {
      ...state,
      rngState: generated.rngState,
      res: combat.dna.isZero() ? res : { ...res, dna: res.dna.add(combat.dna) },
      units: losses.isZero() ? units : { ...units, soldiers: units.soldiers.sub(losses) },
      site: { type: target.type, size: target.size, stock: target.size },
      map: {
        position,
        candidates: generated.candidates,
        route: [...map.route, { type: target.type, position }].slice(-ROUTE_MAX_POINTS),
        moves,
      },
      travel: null,
    },
    events: [
      {
        type: 'arrived',
        playedMs: state.time.played,
        siteType: target.type,
        losses,
        dna: combat.dna,
      },
    ],
  };
}
