import { type BalanceParams } from '@app/balance/domain/constants';
import {
  distanceBetween,
  siteSecondsLeft,
  swarmRange,
  travelDurationMs,
} from '@app/balance/domain/formulas';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import {
  barPercent,
  roundDownForDisplay,
  roundUpForDisplay,
} from '@app/shared/util/format/display-format';
import { Num } from '@app/shared/util/num/num';
import { MS_PER_SECOND } from '@app/shared/util/time/time-units';
import { assessTargets, type CombatAssessment } from '@app/site/domain/combat-logic';
import { candidateInfos, type CandidateInfo } from '@app/site/domain/map-logic';
import type { SiteCandidate } from '@app/site/domain/models/map.model';
import { departureBlocker } from '@app/site/domain/move-logic';
import { strategyTarget } from '@app/site/domain/strategy-logic';
import { canConvertDronesToQueen, queenPriceInDrones } from '@app/swarm/domain/sacrifice-logic';
import { planTransport } from '@app/swarm/domain/transport-logic';

import { maxThresholdPercent, thresholdToPercent } from '../../domain/auto-threshold-logic';
import {
  approachPath,
  arcDash,
  HERE_RADIUS,
  MAP_CENTER,
  MAP_RADIUS,
  MAP_SIZE,
  mapScale,
  nodeRadii,
  spokes,
  sweepPath,
  toMapPoint,
  trail,
  travelLine,
} from '../../domain/sonar-map-logic';
import type { MoveSettingsView } from '../../ui/form-move-settings/form-move-settings.component.model';
import type {
  CountView,
  QueenConversionView,
  TargetBlocker,
  TargetDetails,
  TargetVerdict,
  TargetView,
  TransportView,
} from '../../ui/models/target.model';
import type { MapNodeView, SonarMapView } from '../../ui/sonar-map/sonar-map.component.model';
import type { CurrentSiteView, SonarSource, SonarView, TravelView } from './sonar.model';

const PERCENT = 100;

export function toSonarView(source: SonarSource, params: BalanceParams): SonarView {
  const { state } = source;
  const { candidates, position } = state.map;
  const range = swarmRange(params);
  const infos = candidateInfos(candidates, position, range, params);
  const combats = assessTargets(state, params);
  const traveling = state.travel !== null;
  // Während der Reise gelten Strategieziel und Transportvorschau erst nach der Ankunft wieder.
  const chosen = traveling ? null : strategyTarget(state, state.auto.strategy, params);
  const selectedIndex = isIndex(source.selected, candidates.length) ? source.selected : chosen;
  const targets = candidates.map((candidate, index) =>
    toTargetView(state, candidate, index, infos[index], combats[index], {
      strategyChoice: index === chosen,
      selected: index === selectedIndex,
      params,
    }),
  );
  return {
    site: toCurrentSiteView(state, params),
    range,
    travel: toTravelView(state),
    targets,
    selected: selectedIndex === null ? null : targets[selectedIndex],
    strategyTarget: chosen,
    transport: traveling ? null : toTransportView(state, params),
    queen: toQueenView(state, params),
    forfeitedStock:
      state.travel === null && state.site.stock.gt(Num.ZERO) ? state.site.stock : null,
    settings: toSettingsView(state, params),
    map: toMapView(state, targets, infos, range, params),
  };
}

/** Geometrie der Sonar-Karte (US-04.12); Urteile und Auswahl kommen aus den `targets`. */
function toMapView(
  state: GameState,
  targets: readonly TargetView[],
  infos: readonly CandidateInfo[],
  range: number,
  params: BalanceParams,
): SonarMapView {
  const { candidates, position, route } = state.map;
  const scale = mapScale(
    range,
    infos.map((info) => info.distance),
  );
  const radii = nodeRadii(
    candidates.map((candidate, i) => (targets[i].details ? candidate.size : null)),
  );
  const points = candidates.map((candidate) =>
    toMapPoint(candidate.position, position, scale.unit),
  );
  const nodes = targets.map((target, i) => toMapNode(target, points[i], radii[i]));
  const selected = targets.find((target) => target.selected);
  const routeTarget =
    state.travel === null && selected?.status === 'in-range' ? points[selected.index] : null;
  return {
    viewBox: `0 0 ${MAP_SIZE} ${MAP_SIZE}`,
    center: MAP_CENTER,
    outerRadius: MAP_RADIUS,
    labelX: MAP_CENTER + LABEL_GAP,
    rings: Array.from({ length: scale.rings }, (_v, i) => {
      const distance = scale.rings - i;
      return {
        distance,
        radius: distance * scale.unit,
        labelY: MAP_CENTER - distance * scale.unit - LABEL_GAP,
        labeled: Math.abs(distance - range) >= 0.5,
      };
    }),
    spokes: spokes(scale),
    sweep: sweepPath(),
    range: {
      value: range,
      radius: range * scale.unit,
      labelY: MAP_CENTER - range * scale.unit - LABEL_GAP,
    },
    trail: trail(
      route.map((point) => point.position),
      position,
      scale.unit,
    ),
    nodes,
    route: routeTarget === null ? null : approachPath(routeTarget),
    travel: toMapTravel(state, scale.unit, params),
    here: {
      type: state.site.type,
      translate: `translate(${MAP_CENTER} ${MAP_CENTER})`,
      radius: HERE_RADIUS,
      labelY: HERE_RADIUS + HERE_LABEL_GAP,
    },
  };
}

const LABEL_GAP = 7;
const HERE_LABEL_GAP = 20;

function toMapNode(
  target: TargetView,
  point: { x: number; y: number },
  radius: number,
): MapNodeView {
  const { details } = target;
  const halo = radius + 6;
  return {
    target,
    translate: `translate(${point.x} ${point.y})`,
    radius,
    ballScale: `scale(${radius})`,
    haloRadius: halo,
    selectionRadius: radius + 14,
    focusRadius: radius + 18,
    defenseDash:
      details === null || !details.defense.gt(Num.ZERO)
        ? null
        : arcDash(halo, details.defenseBarPercent / PERCENT),
    labelY: radius + 24,
    dnaY: radius + 39,
    markY: -(radius + 20),
    dimmed: target.status !== 'in-range' || target.blocker === 'traveling',
  };
}

function toMapTravel(
  state: GameState,
  unit: number,
  params: BalanceParams,
): SonarMapView['travel'] {
  const { travel, map } = state;
  if (travel === null) {
    return null;
  }
  const totalMs = travelDurationMs(distanceBetween(map.position, travel.target.position), params);
  const progress = totalMs > 0 ? 1 - travel.remainingMs / totalMs : 1;
  return travelLine(toMapPoint(travel.target.position, map.position, unit), progress);
}

function isIndex(value: number | null, length: number): value is number {
  return value !== null && Number.isInteger(value) && value >= 0 && value < length;
}

function toTargetView(
  state: GameState,
  candidate: SiteCandidate,
  index: number,
  info: CandidateInfo,
  combat: CombatAssessment,
  flags: { strategyChoice: boolean; selected: boolean; params: BalanceParams },
): TargetView {
  const { strategyChoice, selected, params } = flags;
  return {
    index,
    status: info.status,
    verdict: toVerdict(info, combat),
    strategyChoice,
    selected,
    blocker: toBlocker(state, index, info, params),
    details: info.status === 'unexplored' ? null : toDetails(candidate, info, combat),
  };
}

function toVerdict(info: CandidateInfo, combat: CombatAssessment): TargetVerdict {
  switch (info.status) {
    case 'unexplored':
      return 'unexplored';
    case 'out-of-range':
      return 'out-of-range';
    case 'in-range':
      return combat.capturable ? 'capturable' : 'too-strong';
  }
}

function toBlocker(
  state: GameState,
  index: number,
  info: CandidateInfo,
  params: BalanceParams,
): TargetBlocker | null {
  const blocker = departureBlocker(state, index, params);
  // Der Kern unterscheidet unerforscht nicht von außer Reichweite; die Umgebung nennt es eigens.
  return blocker === 'out-of-range' && info.status === 'unexplored' ? 'unexplored' : blocker;
}

function toDetails(
  candidate: SiteCandidate,
  info: CandidateInfo,
  combat: CombatAssessment,
): TargetDetails {
  const { attack, capturable } = combat;
  const { defense } = candidate;
  // Gemeinsame Skala: Der stärkere Wert füllt den Balken. Der Angriff zählt wie angezeigt
  // (abgerundet), damit ein Rest wie 0,3 neben der Anzeige „0 vs. 0“ keinen vollen Balken füllt.
  const shownAttack = roundDownForDisplay(attack);
  const scale = shownAttack.max(defense);
  const share = (value: Num) => (scale.gt(Num.ZERO) ? barPercent(value.div(scale)) : 0);
  return {
    type: candidate.type,
    size: candidate.size,
    distance: info.distance,
    travelSeconds: Num.from(info.travelMs / MS_PER_SECOND),
    defense,
    dna: info.dna,
    rewardsDna: info.dna.gt(Num.ZERO),
    findChancePercent: info.findChance * PERCENT,
    attack,
    losses: capturable
      ? { soldiers: countUp(combat.losses), percent: combat.lossShare.mul(PERCENT) }
      : null,
    attackBarPercent: share(shownAttack),
    defenseBarPercent: share(defense),
  };
}

function toCurrentSiteView({ units, site }: GameState, params: BalanceParams): CurrentSiteView {
  const { type, stock, size } = site;
  return {
    type,
    stock,
    size,
    stockPercent: size.isZero() ? 0 : barPercent(stock.div(size)),
    // Leer ist leer: `siteSecondsLeft` liefert sonst 0 s statt keiner Angabe.
    secondsLeft: stock.isZero() ? null : siteSecondsLeft(units, stock, params),
  };
}

function toTravelView({ travel }: GameState): TravelView | null {
  return travel === null
    ? null
    : {
        type: travel.target.type,
        secondsLeft: Num.from(Math.max(travel.remainingMs, 0) / MS_PER_SECOND),
      };
}

function toTransportView(state: GameState, params: BalanceParams): TransportView {
  const { carried, leftBehind, fitsAll } = planTransport(state.units, state.priority, params);
  return {
    priority: state.priority,
    carriedDrones: countDown(carried.drones),
    carriedSoldiers: countDown(carried.soldiers),
    leftDrones: nonZero(countUp(leftBehind.drones)),
    leftSoldiers: nonZero(countUp(leftBehind.soldiers)),
    fitsAll,
  };
}

function toQueenView(state: GameState, params: BalanceParams): QueenConversionView {
  const price = queenPriceInDrones(state, params);
  return {
    drones: state.units.drones,
    price: price === null ? null : countUp(price),
    possible: canConvertDronesToQueen(state, params),
  };
}

function toSettingsView({ auto, priority }: GameState, params: BalanceParams): MoveSettingsView {
  return {
    priority,
    strategy: auto.strategy,
    autoEnabled: auto.enabled,
    thresholdPercent: thresholdToPercent(auto.threshold),
    maxThresholdPercent: maxThresholdPercent(params),
  };
}

function countUp(amount: Num): CountView {
  return { amount, shown: roundUpForDisplay(amount).toNumber() };
}

function countDown(amount: Num): CountView {
  return { amount, shown: roundDownForDisplay(amount).toNumber() };
}

function nonZero(count: CountView): CountView | null {
  return count.shown > 0 ? count : null;
}
