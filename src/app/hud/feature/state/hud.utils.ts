import { BalanceParams } from '@app/balance/domain/constants';
import {
  baseFoodPerSecond,
  droneFoodPerSecond,
  eggsPerMinute,
  foodPerSecond,
  isSpaceOverfull,
  isSpaceWarning,
  nextQueenEffect,
  sacrificeFood,
  sacrificeLossShare,
  siteSecondsLeft,
  spaceAvailable,
  spaceUsage,
  spaceUsed,
  totalAttack,
  unitPrice,
} from '@app/balance/domain/formulas';
import type { Modifiers } from '@app/balance/domain/models/effect.model';
import type { LogEntry } from '@app/engine/data-access/game-store/game-store-service.model';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import { stateModifiers } from '@app/engine/domain/modifiers-logic';
import { isValidTimestamp } from '@app/shared/util/format/date-format';
import {
  barPercent,
  roundDownForDisplay,
  roundUpForDisplay,
} from '@app/shared/util/format/display-format';
import { Num } from '@app/shared/util/num/num';
import { MS_PER_SECOND } from '@app/shared/util/time/time-units';
import type { UnitType } from '@app/swarm/domain/models/units.model';
import { canBuy } from '@app/swarm/domain/units-logic';

import type { UnitView } from '../../ui/buy-button/buy-button.component.model';
import type { LogEntryView } from '../../ui/event-log/event-log.component.model';
import type { SiteView } from '../../ui/feeding-site/feeding-site.component.model';
import type { SacrificeView } from '../../ui/form-sacrifice-drones/form-sacrifice-drones.component.model';
import type { HudNotice, HudSource, HudView, SpaceView } from './hud.model';

/** Reihenfolge der Aktionsleiste, vom ersten Kauf zur teuersten Einheit. */
export const BUY_ORDER: readonly UnitType[] = ['drones', 'soldiers', 'queens'];

export function toHudView(source: HudSource, params: BalanceParams): HudView {
  const { state } = source;
  const { units, site, pheromones } = state;
  const modifiers = stateModifiers(state, params);
  return {
    food: state.res.food,
    dna: state.res.dna,
    foodRate: foodPerSecond(units, site.stock, params, modifiers),
    baseRate: baseFoodPerSecond(site.stock, params),
    droneRate: droneFoodPerSecond(units, site.stock, params, modifiers),
    eggsPerMinute: eggsPerMinute(units, pheromones, params, modifiers),
    attack: totalAttack(units, params, modifiers),
    site: toSiteView(state, params, modifiers),
    space: toSpaceView(state, params, modifiers),
    units: BUY_ORDER.map((unit) => toUnitView(state, unit, params, modifiers)),
    sacrifice: toSacrificeView(state, params, modifiers),
    lastSavedAt:
      source.lastSavedAt !== null && isValidTimestamp(source.lastSavedAt)
        ? source.lastSavedAt
        : null,
    notices: toNotices(source),
  };
}

function toUnitView(
  state: GameState,
  unit: UnitType,
  params: BalanceParams,
  modifiers: Modifiers,
): UnitView {
  const affordable = canBuy(state, unit, params);
  const rounded = roundUpForDisplay(unitPrice(unit, state.bought, params));
  // Aufgerundet verlangte ein kaufbarer Knopf bei 10,8 Nahrung und Preis 10,7 sichtbar 11 von 10.
  const price = affordable ? rounded.min(roundDownForDisplay(state.res.food)) : rounded;
  return {
    id: unit,
    count: state.units[unit],
    price,
    affordable,
    queenEffect: unit === 'queens' ? nextQueenEffect(state.pheromones, params, modifiers) : null,
  };
}

/** Log für die Anzeige, neueste Einträge zuerst. */
export function toLogView(log: readonly LogEntry[]): readonly LogEntryView[] {
  return [...log].reverse();
}

function toSiteView(
  { units, site, travel }: GameState,
  params: BalanceParams,
  modifiers: Modifiers,
): SiteView {
  const { stock, size } = site;
  return {
    type: site.type,
    rate: foodPerSecond(units, stock, params, modifiers),
    stock,
    size,
    stockPercent: size.isZero() ? 0 : barPercent(stock.div(size)),
    secondsLeft: siteSecondsLeft(units, stock, params, modifiers),
    empty: stock.isZero(),
    travel:
      travel === null
        ? null
        : {
            target: travel.target.type,
            secondsLeft: Num.from(travel.remainingMs).div(MS_PER_SECOND),
          },
  };
}

function toSacrificeView(
  { units }: GameState,
  params: BalanceParams,
  modifiers: Modifiers,
): SacrificeView {
  return {
    maxCount: units.drones.floor().toNumber(),
    foodPerDrone: sacrificeFood(Num.ONE, params, modifiers),
    lossPercent: sacrificeLossShare(params, modifiers) * 100,
  };
}

function toSpaceView({ units }: GameState, params: BalanceParams, modifiers: Modifiers): SpaceView {
  const usage = spaceUsage(units, params, modifiers);
  const used = spaceUsed(units, params);
  const available = spaceAvailable(units, params, modifiers);
  return {
    used,
    available,
    usagePercent: usage === null ? null : usage.mul(100),
    // Ohne verfügbaren Platz ist jede belegte Einheit schon zu viel.
    barPercent: usage !== null ? barPercent(usage) : used.isZero() ? 0 : 100,
    warning: isSpaceWarning(units, params, modifiers),
    overfull: isSpaceOverfull(units, params, modifiers),
  };
}

function toNotices({ notice, lastSaveError }: HudSource): HudNotice[] {
  const notices: HudNotice[] = notice === null ? [] : [notice];
  if (lastSaveError !== null) {
    notices.push('save-failed');
  }
  return notices;
}
