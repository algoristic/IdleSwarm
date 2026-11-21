import { BalanceParams } from '@app/balance/domain/constants';
import {
  baseFoodPerSecond,
  distributedPheromonePoints,
  droneFoodPerSecond,
  eggsPerMinute,
  eggsPerPheromonePoint,
  foodPerSecond,
  freePheromonePoints,
  glandPrice,
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
  totalPheromonePoints,
  unitPrice,
} from '@app/balance/domain/formulas';
import type { Modifiers, ValueEffect } from '@app/balance/domain/models/effect.model';
import type { LogEntry } from '@app/engine/data-access/game-store/game-store-service.model';
import { isReturnSummaryDue } from '@app/engine/domain/catch-up-logic';
import type { CatchUpSummary } from '@app/engine/domain/models/catch-up.model';
import type { GameEvent } from '@app/engine/domain/models/game-event.model';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import { stateModifiers } from '@app/engine/domain/modifiers-logic';
import { badgeEffect, findsDrawer } from '@app/finds/domain/collection-logic';
import { isBuffActive } from '@app/finds/domain/finds-logic';
import { availableNodeCount } from '@app/genome/domain/genome-logic';
import type {
  Onboarding,
  OnboardingUnlockId,
} from '@app/onboarding/domain/models/onboarding.model';
import { isUnlocked } from '@app/onboarding/domain/onboarding-logic';
import { isValidTimestamp } from '@app/shared/util/format/date-format';
import {
  barPercent,
  roundDownForDisplay,
  roundUpForDisplay,
  splitPercents,
} from '@app/shared/util/format/display-format';
import { DEFAULT_NOTATION, Notation } from '@app/shared/util/format/format';
import { Num } from '@app/shared/util/num/num';
import { MS_PER_SECOND } from '@app/shared/util/time/time-units';
import type { UnitType } from '@app/swarm/domain/models/units.model';
import { canSetPheromones, canStrengthenGland } from '@app/swarm/domain/pheromone-logic';
import { canBuy } from '@app/swarm/domain/units-logic';

import type { UnitView } from '../../ui/buy-button/buy-button.component.model';
import type {
  ReturnSummaryFindView,
  ReturnSummarySiteView,
  ReturnSummaryUnitView,
  ReturnSummaryView,
} from '../../ui/dialog-return-summary/dialog-return-summary.component.model';
import type { LogEntryView, LogItemKind } from '../../ui/event-log/event-log.component.model';
import type { SiteView } from '../../ui/feeding-site/feeding-site.component.model';
import type { BadgeBonusView, FindsView } from '../../ui/finds-panel/finds-panel.component.model';
import type { SacrificeView } from '../../ui/form-sacrifice-drones/form-sacrifice-drones.component.model';
import type {
  PheromoneDistribution,
  PheromoneRowView,
  PheromoneUnit,
  PheromoneView,
} from '../../ui/pheromone-panel/pheromone-panel.component.model';
import { HUD_DRAWERS } from './hud.model';
import type { HudDrawer, HudNotice, HudSource, HudUnlocks, HudView, SpaceView } from './hud.model';

/** Reihenfolge der Aktionsleiste, vom ersten Kauf zur teuersten Einheit. */
export const BUY_ORDER: readonly UnitType[] = ['drones', 'soldiers', 'queens'];

/** Freischaltung je Einheit der Aktionsleiste (Game-Design §4.18); `null` = von Anfang an. */
export const UNIT_UNLOCKS: Readonly<Record<UnitType, OnboardingUnlockId | null>> = {
  queens: null,
  drones: null,
  soldiers: 'map',
};

/** Freischaltung je Schublade (Game-Design §4.18): „Drohnen opfern“ kommt mit der Umgebung. */
export const DRAWER_UNLOCKS: Readonly<Record<HudDrawer, OnboardingUnlockId>> = {
  pheromones: 'pheromones',
  finds: 'finds',
  sacrifice: 'map',
};

/** Zeilen des Pheromon-Panels wie im Mockup: Drohnen, dann Soldaten. */
export const PHEROMONE_ORDER: readonly PheromoneUnit[] = ['drones', 'soldiers'];

export function toHudView(source: HudSource, params: BalanceParams): HudView {
  const { state, notation = DEFAULT_NOTATION } = source;
  const { units, site, pheromones } = state;
  const modifiers = stateModifiers(state, params);
  const unlocks = toHudUnlocks(state.onboarding);
  const open = (unlock: OnboardingUnlockId | null): boolean => unlock === null || unlocks[unlock];
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
    unlocks,
    units: BUY_ORDER.filter((unit) => open(UNIT_UNLOCKS[unit])).map((unit) =>
      toUnitView(state, unit, params, modifiers, notation),
    ),
    drawers: HUD_DRAWERS.filter((drawer) => open(DRAWER_UNLOCKS[drawer])),
    sacrifice: toSacrificeView(state, params, modifiers),
    pheromones: toPheromoneView(state, params, modifiers, notation),
    finds: toFindsView(state, params),
    availableAdaptations: availableNodeCount(state, params),
    lastSavedAt:
      source.lastSavedAt !== null && isValidTimestamp(source.lastSavedAt)
        ? source.lastSavedAt
        : null,
    notices: toNotices(source),
  };
}

/** Freischaltungen des Onboardings als Lookup für Viewmodel und Templates. */
export function toHudUnlocks(onboarding: Onboarding): HudUnlocks {
  return {
    pheromones: isUnlocked(onboarding, 'pheromones'),
    map: isUnlocked(onboarding, 'map'),
    finds: isUnlocked(onboarding, 'finds'),
    genome: isUnlocked(onboarding, 'genome'),
  };
}

function toUnitView(
  state: GameState,
  unit: UnitType,
  params: BalanceParams,
  modifiers: Modifiers,
  notation: Notation,
): UnitView {
  const affordable = canBuy(state, unit, params);
  return {
    id: unit,
    count: state.units[unit],
    price: displayPrice(
      unitPrice(unit, state.bought, params),
      affordable,
      state.res.food,
      notation,
    ),
    affordable,
    queenEffect: unit === 'queens' ? nextQueenEffect(state.pheromones, params, modifiers) : null,
  };
}

/** Aufgerundeter Preis; bei einem kaufbaren Knopf nie über der abgerundet angezeigten Nahrung. */
function displayPrice(price: Num, affordable: boolean, food: Num, notation: Notation): Num {
  const rounded = roundUpForDisplay(price, notation);
  // Aufgerundet verlangte ein kaufbarer Knopf bei 10,8 Nahrung und Preis 10,7 sichtbar 11 von 10.
  return affordable ? rounded.min(roundDownForDisplay(food, notation)) : rounded;
}

/**
 * Pheromon-Panel (US-03.01–03.03, Game-Design §4.15): Punkte, Verteilung in %, die Verteilung nach
 * „+“ bzw. „−“ je Typ und der Kauf eines Drüsenpunkts.
 */
export function toPheromoneView(
  state: GameState,
  params: BalanceParams,
  modifiers: Modifiers,
  notation: Notation = DEFAULT_NOTATION,
): PheromoneView {
  const { pheromones } = state;
  const [dronePercent = 0, soldierPercent = 0] = splitPercents([
    pheromones.drones,
    pheromones.soldiers,
  ]);
  const affordable = canStrengthenGland(state, params);
  return {
    total: totalPheromonePoints(pheromones, params, modifiers),
    distributed: distributedPheromonePoints(pheromones),
    free: freePheromonePoints(pheromones, params, modifiers),
    rows: PHEROMONE_ORDER.map((unit) => toPheromoneRow(state, unit, params, modifiers)),
    dronePercent,
    soldierPercent,
    gland: {
      price: displayPrice(glandPrice(pheromones, params), affordable, state.res.food, notation),
      affordable,
      eggsPerPoint: eggsPerPheromonePoint(state.units, params, modifiers),
    },
  };
}

function toPheromoneRow(
  state: GameState,
  unit: PheromoneUnit,
  params: BalanceParams,
  modifiers: Modifiers,
): PheromoneRowView {
  const current: PheromoneDistribution = {
    drones: state.pheromones.drones,
    soldiers: state.pheromones.soldiers,
  };
  const points = current[unit];
  // Dieselbe Prüfung wie das Kommando: Ein Knopf ist nur aktiv, wenn `setPheromones` wirkt.
  const target = (change: number): PheromoneDistribution | null => {
    const next = { ...current, [unit]: points + change };
    return canSetPheromones(state, next.drones, next.soldiers, params, modifiers) ? next : null;
  };
  return {
    id: unit,
    points,
    increase: target(1),
    decrease: points > 0 ? target(-1) : null,
  };
}

/**
 * Funde-Panel (US-06.03, US-06.04): Schublade „Funde“ aus `findsDrawer`, je Set der Bonus des
 * Badges und die laufenden Buffs mit Restzeit in Spielzeit.
 */
export function toFindsView(state: GameState, params: BalanceParams): FindsView {
  const { finds, time } = state;
  const drawer = findsDrawer(finds, params);
  return {
    progress: drawer.progress,
    sets: drawer.sets.map((set) => ({ ...set, bonus: toBadgeBonus(badgeEffect(set.id, params)) })),
    fragments: drawer.fragments,
    buffs: finds.buffs
      .filter((buff) => isBuffActive(buff, time.played))
      .map((buff) => ({
        id: buff.id,
        secondsLeft: Num.from(buff.expiresAtMs - time.played).div(MS_PER_SECOND),
      })),
  };
}

/** `add` wirkt auf einen Modifikator mit Basiswert 1, `mul` als Faktor (Game-Design §4.13). */
function toBadgeBonus({ target, op, value }: ValueEffect): BadgeBonusView {
  const change = op === 'add' ? value : value - 1;
  return { target, lowers: change < 0, percent: Math.abs(change) * 100 };
}

/** Log für die Anzeige, neueste Einträge zuerst, je Eintrag mit seiner Darstellungsart. */
export function toLogView(log: readonly LogEntry[]): readonly LogEntryView[] {
  return [...log].reverse().map((entry) => ({ ...entry, kind: logItemKind(entry.event) }));
}

/**
 * Darstellungsart eines Ereignisses (Mockup `.log`): Verluste und Zurückgelassene vor Aufbruch und
 * Ankunft, damit ein verlustreicher Zug auffällt; Adaptionen kosten DNA.
 */
export function logItemKind(event: GameEvent): LogItemKind {
  switch (event.type) {
    case 'found':
      return 'found';
    case 'evolved':
      return 'dna';
    case 'departed': {
      const { drones, soldiers } = event.leftBehind;
      return drones.gt(Num.ZERO) || soldiers.gt(Num.ZERO) ? 'loss' : 'travel';
    }
    case 'arrived':
      return event.losses.gt(Num.ZERO) ? 'loss' : 'travel';
    case 'siteDepleted':
      return 'default';
  }
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

function toNotices({ notice, lastSaveError, updateReady = false }: HudSource): HudNotice[] {
  const notices: HudNotice[] = notice === null ? [] : [notice];
  if (lastSaveError !== null) {
    notices.push('save-failed');
  }
  if (updateReady) {
    notices.push('update-ready');
  }
  return notices;
}

/**
 * Rückkehr-Zusammenfassung (US-07.03) aus dem letzten Nachholen; `null`, solange keines vorliegt
 * oder die Abwesenheit unter `RETURN_SUMMARY_MIN_MS` liegt.
 */
export function toReturnSummaryView(summary: CatchUpSummary | null): ReturnSummaryView | null {
  if (summary === null || !isReturnSummaryDue(summary)) {
    return null;
  }
  const seconds = (ms: number): Num => Num.from(ms).div(MS_PER_SECOND);
  const hatched: ReturnSummaryUnitView[] = BUY_ORDER.filter((unit) =>
    roundDownForDisplay(summary.hatched[unit]).gt(0),
  ).map((unit) => ({ unit, count: summary.hatched[unit] }));
  const lost: ReturnSummaryUnitView[] = BUY_ORDER.filter((unit) => summary.lost[unit].gt(0)).map(
    (unit) => ({ unit, count: summary.lost[unit] }),
  );
  return {
    caughtUpSeconds: seconds(summary.caughtUpMs),
    capped: summary.capped,
    discardedSeconds: seconds(summary.discardedMs),
    foodGained: summary.food.gained,
    dna: summary.dna,
    hatched,
    lost,
    departures: summary.departures,
    arrivals: countInOrder(summary.arrivals).map(([siteType, count]): ReturnSummarySiteView => ({
      siteType,
      count,
    })),
    findCount: summary.finds.length,
    finds: countInOrder(summary.finds.map((find) => find.entry)).map(
      ([entry, count]): ReturnSummaryFindView => ({ entry, count }),
    ),
  };
}

/** Zählt gleiche Werte; die Reihenfolge ist die ihres ersten Auftretens. */
function countInOrder<T>(values: readonly T[]): [T, number][] {
  const counts = new Map<T, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts];
}
