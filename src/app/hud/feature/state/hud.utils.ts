import { BalanceParams, TICK_MS, TICKS_PER_SECOND } from '@app/balance/domain/constants';
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
import type { LogEntry } from '@app/engine/data-access/game-store/game-store-service.model';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import { isValidTimestamp } from '@app/shared/util/format/date-format';
import {
  barPercent,
  roundDownForDisplay,
  roundUpForDisplay,
} from '@app/shared/util/format/display-format';
import { Num } from '@app/shared/util/num/num';
import type { UnitType } from '@app/swarm/domain/models/units.model';
import { canBuy } from '@app/swarm/domain/units-logic';

import type { UnitView } from '../../ui/buy-button/buy-button.component.model';
import type { LogEntryView } from '../../ui/event-log/event-log.component.model';
import type { SiteView } from '../../ui/feeding-site/feeding-site.component.model';
import type { SacrificeView } from '../../ui/form-sacrifice-drones/form-sacrifice-drones.component.model';
import type { HudNotice, HudSource, HudView, SpaceView } from './hud.model';

/** Millisekunden je Sekunde Spielzeit, aus dem Logik-Takt abgeleitet. */
const MS_PER_SECOND = TICK_MS * TICKS_PER_SECOND;

/** Reihenfolge der Aktionsleiste, vom ersten Kauf zur teuersten Einheit. */
export const BUY_ORDER: readonly UnitType[] = ['drones', 'soldiers', 'queens'];

export function toHudView(source: HudSource, params: BalanceParams): HudView {
  const { state } = source;
  const { units, site } = state;
  return {
    food: state.res.food,
    dna: state.res.dna,
    foodRate: foodPerSecond(units, site.stock, params),
    baseRate: baseFoodPerSecond(site.stock, params),
    droneRate: droneFoodPerSecond(units, site.stock, params),
    eggsPerMinute: eggsPerMinute(units, params),
    attack: totalAttack(units, params),
    site: toSiteView(state, params),
    space: toSpaceView(state, params),
    units: BUY_ORDER.map((unit) => toUnitView(state, unit, params)),
    sacrifice: toSacrificeView(state, params),
    lastSavedAt:
      source.lastSavedAt !== null && isValidTimestamp(source.lastSavedAt)
        ? source.lastSavedAt
        : null,
    notices: toNotices(source),
  };
}

function toUnitView(state: GameState, unit: UnitType, params: BalanceParams): UnitView {
  const affordable = canBuy(state, unit, params);
  const rounded = roundUpForDisplay(unitPrice(unit, state.bought, params));
  // Aufgerundet verlangte ein kaufbarer Knopf bei 10,8 Nahrung und Preis 10,7 sichtbar 11 von 10.
  const price = affordable ? rounded.min(roundDownForDisplay(state.res.food)) : rounded;
  return {
    id: unit,
    count: state.units[unit],
    price,
    affordable,
    queenEffect: unit === 'queens' ? nextQueenEffect(params) : null,
  };
}

/** Log für die Anzeige, neueste Einträge zuerst. */
export function toLogView(log: readonly LogEntry[]): readonly LogEntryView[] {
  return [...log].reverse();
}

function toSiteView({ units, site, travel }: GameState, params: BalanceParams): SiteView {
  const { stock, size } = site;
  return {
    type: site.type,
    rate: foodPerSecond(units, stock, params),
    stock,
    size,
    stockPercent: size.isZero() ? 0 : barPercent(stock.div(size)),
    secondsLeft: siteSecondsLeft(units, stock, params),
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

function toSacrificeView({ units }: GameState, params: BalanceParams): SacrificeView {
  return {
    maxCount: units.drones.floor().toNumber(),
    foodPerDrone: sacrificeFood(Num.ONE, params),
    lossPercent: sacrificeLossShare(params) * 100,
  };
}

function toSpaceView({ units }: GameState, params: BalanceParams): SpaceView {
  const usage = spaceUsage(units, params);
  const used = spaceUsed(units, params);
  const available = spaceAvailable(units, params);
  return {
    used,
    available,
    usagePercent: usage === null ? null : usage.mul(100),
    // Ohne verfügbaren Platz ist jede belegte Einheit schon zu viel.
    barPercent: usage !== null ? barPercent(usage) : used.isZero() ? 0 : 100,
    warning: isSpaceWarning(units, params),
    overfull: isSpaceOverfull(units, params),
  };
}

function toNotices({ notice, lastSaveError }: HudSource): HudNotice[] {
  const notices: HudNotice[] = notice === null ? [] : [notice];
  if (lastSaveError !== null) {
    notices.push('save-failed');
  }
  return notices;
}
