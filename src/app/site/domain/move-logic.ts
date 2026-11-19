import type { BalanceParams } from '@app/balance/domain/constants';
import { recycledFood, swarmRange } from '@app/balance/domain/formulas';
import type { Modifiers } from '@app/balance/domain/models/effect.model';
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
  modifiers: Modifiers,
): DepartureBlocker | null {
  const { candidates, position } = state.map;
  if (state.travel !== null) {
    return 'traveling';
  }
  if (!Number.isInteger(target) || target < 0 || target >= candidates.length) {
    return 'unknown-target';
  }
  const candidate = candidates[target];
  const range = swarmRange(params, modifiers);
  if (candidateInfo(candidate, position, range, params, modifiers).status !== 'in-range') {
    return 'out-of-range';
  }
  return assessTarget(state, candidate, params, modifiers).capturable ? null : 'too-strong';
}

export function canDepart(
  state: GameState,
  target: number,
  params: BalanceParams,
  modifiers: Modifiers,
): boolean {
  return departureBlocker(state, target, params, modifiers) === null;
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
  modifiers: Modifiers,
): SiteResult {
  if (!canDepart(state, target, params, modifiers)) {
    return { state, events: NO_EVENTS };
  }
  const { map, site, units, priority } = state;
  const candidate = map.candidates[target];
  const range = swarmRange(params, modifiers);
  const { distance, travelMs } = candidateInfo(candidate, map.position, range, params, modifiers);
  const { carried, leftBehind } = planTransport(units, priority, params, modifiers);
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
 * Ankunft am Reiseziel (Game-Design §4.11): Kampf mit den vorhandenen Soldaten, DNA, Autophagie
 * (§4.13), neue Futterstelle mit vollem Vorrat, Route, `z + 1` und neue Kandidaten um die neue
 * Position. Das Ereignis trägt die Spielzeit des Zustands. Ohne Reise kommt derselbe Zustand zurück.
 *
 * `modifiers` gelten bei der Ankunft, also noch während der Reise: Bedingte Effekte zählen nicht.
 * Bedingungen gibt es in Ära I nur beim Sammeln, Kampf und Reichweite betreffen sie nicht.
 */
export function arrive(state: GameState, params: BalanceParams, modifiers: Modifiers): SiteResult {
  const { travel, map, res, units } = state;
  if (travel === null) {
    return { state, events: NO_EVENTS };
  }
  const { target } = travel;
  // Dieselbe Rechnung wie `applyCapture`; der Verlust ist auf die vorhandenen Soldaten begrenzt.
  const combat = assessCombat(units.soldiers, target.defense, params, modifiers);
  const losses = combat.losses.min(units.soldiers);
  const recycled = recycledFood(losses, params, modifiers);
  const moves = map.moves + 1;
  const position = { ...target.position };
  const range = swarmRange(params, modifiers);
  const generated = generateCandidates(
    { origin: position, moves, range, rngState: state.rngState },
    params,
  );
  const food = recycled.isZero() ? res.food : res.food.add(recycled);
  return {
    state: {
      ...state,
      rngState: generated.rngState,
      res:
        combat.dna.isZero() && food === res.food
          ? res
          : { ...res, food, dna: res.dna.add(combat.dna) },
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
