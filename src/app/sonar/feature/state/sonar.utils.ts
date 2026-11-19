import { type BalanceParams, TICK_MS, TICKS_PER_SECOND } from '@app/balance/domain/constants';
import { siteSecondsLeft, swarmRange } from '@app/balance/domain/formulas';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import { barPercent } from '@app/shared/util/format/display-format';
import { Num } from '@app/shared/util/num/num';
import { assessTargets, type CombatAssessment } from '@app/site/domain/combat-logic';
import { candidateInfos, type CandidateInfo } from '@app/site/domain/map-logic';
import type { SiteCandidate } from '@app/site/domain/models/map.model';
import { departureBlocker } from '@app/site/domain/move-logic';
import { strategyTarget } from '@app/site/domain/strategy-logic';
import { canConvertDronesToQueen, queenPriceInDrones } from '@app/swarm/domain/sacrifice-logic';
import { planTransport } from '@app/swarm/domain/transport-logic';

import { maxThresholdPercent, thresholdToPercent } from '../../domain/auto-threshold-logic';
import type { MoveSettingsView } from '../../ui/form-move-settings/form-move-settings.component.model';
import type {
  QueenConversionView,
  TargetDetails,
  TargetVerdict,
  TargetView,
  TransportView,
} from '../../ui/models/target.model';
import type { CurrentSiteView, SonarSource, SonarView, TravelView } from './sonar.model';

const MS_PER_SECOND = TICK_MS * TICKS_PER_SECOND;
const PERCENT = 100;

export function toSonarView(source: SonarSource, params: BalanceParams): SonarView {
  const { state } = source;
  const { candidates, position } = state.map;
  const range = swarmRange(params);
  const infos = candidateInfos(candidates, position, range, params);
  const combats = assessTargets(state, params);
  const chosen = strategyTarget(state, state.auto.strategy, params);
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
    transport: toTransportView(state, params),
    queen: toQueenView(state, params),
    forfeitedStock:
      state.travel === null && state.site.stock.gt(Num.ZERO) ? state.site.stock : null,
    settings: toSettingsView(state, params),
  };
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
    blocker: departureBlocker(state, index, params),
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

function toDetails(
  candidate: SiteCandidate,
  info: CandidateInfo,
  combat: CombatAssessment,
): TargetDetails {
  const { attack, capturable } = combat;
  const { defense } = candidate;
  // Gemeinsame Skala: Der stärkere Wert füllt den Balken.
  const scale = attack.max(defense);
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
    losses: capturable ? { soldiers: combat.losses, percent: combat.lossShare.mul(PERCENT) } : null,
    attackBarPercent: share(attack),
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
    secondsLeft: siteSecondsLeft(units, stock, params),
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
    carriedDrones: carried.drones,
    carriedSoldiers: carried.soldiers,
    leftDrones: leftBehind.drones,
    leftSoldiers: leftBehind.soldiers,
    fitsAll,
  };
}

function toQueenView(state: GameState, params: BalanceParams): QueenConversionView {
  return {
    drones: state.units.drones,
    price: queenPriceInDrones(state, params),
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
