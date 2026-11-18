import type { BalanceParams } from '@app/balance/domain/constants';
import {
  baseFoodPerSecond,
  droneFoodPerSecond,
  eggsPerMinute,
  foodPerSecond,
  isSpaceWarning,
  nextQueenEffect,
  siteSecondsLeft,
  spaceAvailable,
  spaceUsage,
  spaceUsed,
  totalAttack,
  unitPrice,
} from '@app/balance/domain/formulas';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import { isValidTimestamp } from '@app/shared/util/format/date-format';
import {
  barPercent,
  roundDownForDisplay,
  roundUpForDisplay,
} from '@app/shared/util/format/display-format';
import type { UnitType } from '@app/swarm/domain/models/units.model';
import { canBuy } from '@app/swarm/domain/units-logic';

import type { UnitView } from '../../ui/buy-button/buy-button.component.model';
import type { SiteView } from '../../ui/feeding-site/feeding-site.component.model';
import type { HudNotice, HudSource, HudView, SpaceView } from './hud.model';

/** Reihenfolge der Aktionsleiste, vom ersten Kauf zur teuersten Einheit. */
export const BUY_ORDER: readonly UnitType[] = ['drones', 'soldiers', 'queens'];

export function toHudView(source: HudSource, params: BalanceParams): HudView {
  const { state } = source;
  const { units, site } = state;
  return {
    food: state.res.food,
    foodRate: foodPerSecond(units, site.stock, params),
    baseRate: baseFoodPerSecond(site.stock, params),
    droneRate: droneFoodPerSecond(units, site.stock, params),
    eggsPerMinute: eggsPerMinute(units, params),
    attack: totalAttack(units, params),
    site: toSiteView(state, params),
    space: toSpaceView(state, params),
    units: BUY_ORDER.map((unit) => toUnitView(state, unit, params)),
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

function toSiteView({ units, site }: GameState, params: BalanceParams): SiteView {
  const { stock, size } = site;
  return {
    rate: foodPerSecond(units, stock, params),
    stock,
    size,
    stockPercent: size.isZero() ? 0 : barPercent(stock.div(size)),
    secondsLeft: siteSecondsLeft(units, stock, params),
    empty: stock.isZero(),
  };
}

function toSpaceView({ units }: GameState, params: BalanceParams): SpaceView {
  const usage = spaceUsage(units, params);
  const used = spaceUsed(units, params);
  return {
    used,
    available: spaceAvailable(units, params),
    usagePercent: usage === null ? null : usage.mul(100),
    // Ohne verfügbaren Platz ist jede belegte Einheit schon zu viel.
    barPercent: usage !== null ? barPercent(usage) : used.isZero() ? 0 : 100,
    warning: isSpaceWarning(units, params),
  };
}

function toNotices({ notice, lastSaveError }: HudSource): HudNotice[] {
  const notices: HudNotice[] = notice === null ? [] : [notice];
  if (lastSaveError !== null) {
    notices.push('save-failed');
  }
  return notices;
}
