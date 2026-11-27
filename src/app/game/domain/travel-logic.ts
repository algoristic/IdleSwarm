import { derive } from './derive-logic';
import { collectFind, getFind, isFindTargetable } from './find-logic';
import { distance } from './geometry-logic';
import { DerivedValues } from './models/derived-values.model';
import { GameConfig } from './models/game-config.model';
import { GameEventHandler } from './models/game-event.model';
import { GameState } from './models/game-state.model';
import { Site } from './models/site.model';
import {
  MarkResult,
  SiteAlternative,
  TargetKind,
  Travel,
  TravelRate,
  TravelTarget,
} from './models/travel.model';
import {
  availableAtArrival,
  availableFood,
  currentSite,
  getSite,
  isSiteTargetable,
} from './site-logic';

export function travelRate(
  config: GameConfig,
  state: GameState,
  site: Site,
  derived: Pick<DerivedValues, 'speed' | 'eatRate'>,
): TravelRate {
  const travelTime = distance(state.position, site) / derived.speed;
  const available = availableAtArrival(config, state, site, travelTime);
  const average =
    derived.eatRate > 0 && available > 0
      ? available / (travelTime + available / derived.eatRate)
      : 0;
  return { travelTime, available, average };
}

export function bestAlternative(
  config: GameConfig,
  state: GameState,
  derived: DerivedValues,
): SiteAlternative | null {
  let best: SiteAlternative | null = null;
  for (const site of state.sites) {
    if (site.id === state.siteId || !isSiteTargetable(config, state, site, derived.thrust))
      continue;
    const rate = travelRate(config, state, site, derived);
    if (
      !best ||
      rate.average > best.average ||
      (rate.average === best.average && rate.travelTime < best.travelTime)
    )
      best = { site, ...rate };
  }
  return best;
}

export function markTarget(
  config: GameConfig,
  state: GameState,
  derived: Pick<DerivedValues, 'thrust'>,
): TravelTarget | null {
  const mark = state.mark;
  if (!mark) return null;
  if (mark.kind === 'site') {
    const site = getSite(state, mark.targetId);
    return isSiteTargetable(config, state, site, derived.thrust) && site.id !== state.siteId
      ? { kind: 'site', site }
      : null;
  }
  const find = getFind(state, mark.targetId);
  return isFindTargetable(config, state, find, derived.thrust) ? { kind: 'find', find } : null;
}

export function depart(
  config: GameConfig,
  state: GameState,
  target: TravelTarget,
  onEvent?: GameEventHandler,
): void {
  const previous = state.siteId != null ? getSite(state, state.siteId) : null;
  if (previous && previous.dead) previous.removeAt = state.time + config.map.removeDelay;
  const destination = target.kind === 'site' ? target.site : target.find;
  if (destination.zone > state.zone) {
    const from = state.zone;
    state.zone = destination.zone;
    state.sites = state.sites.filter((site) => site.zone >= state.zone);
    state.finds = state.finds.filter((find) => find.zone >= state.zone);
    for (const key of Object.keys(state.findRespawnAt))
      if (+key < state.zone) delete state.findRespawnAt[+key];
    state.spawnTimers[state.zone + 1] = 0;
    onEvent?.({ type: 'zoneChanged', from, to: state.zone });
  }
  state.siteId = null;
  state.travel = {
    kind: target.kind,
    targetId: destination.id,
    fromX: state.position.x,
    fromY: state.position.y,
    toX: destination.x,
    toY: destination.y,
    distance: distance(state.position, destination),
    covered: 0,
  };
  state.leaveRequested = false;
  state.stats.travels++;
  if (state.stats.firstTravelAt == null) state.stats.firstTravelAt = state.time;
  onEvent?.({ type: 'departed', kind: target.kind, targetId: destination.id });
}

export function advanceTravel(
  config: GameConfig,
  state: GameState,
  derived: Pick<DerivedValues, 'speed' | 'eggRate'>,
  onEvent?: GameEventHandler,
): void {
  const travel = state.travel;
  if (!travel) return;
  travel.covered = Math.min(travel.distance, travel.covered + derived.speed * config.dt);
  const share = travel.distance > 0 ? travel.covered / travel.distance : 1;
  state.position = {
    x: travel.fromX + (travel.toX - travel.fromX) * share,
    y: travel.fromY + (travel.toY - travel.fromY) * share,
  };
  if (travel.covered < travel.distance) return;
  state.travel = null;
  state.position = { x: travel.toX, y: travel.toY };
  if (state.mark && state.mark.kind === travel.kind && state.mark.targetId === travel.targetId)
    state.mark = null;
  if (travel.kind === 'site') {
    state.siteId = travel.targetId;
    onEvent?.({ type: 'arrived', siteId: travel.targetId });
    return;
  }
  const find = getFind(state, travel.targetId);
  state.siteId = null;
  if (find) collectFind(config, state, find, derived, onEvent);
}

export function expireMark(
  config: GameConfig,
  state: GameState,
  derived: Pick<DerivedValues, 'thrust'>,
  onEvent?: GameEventHandler,
): void {
  const mark = state.mark;
  if (!mark) return;
  const travel = state.travel;
  if (travel && travel.kind === mark.kind && travel.targetId === mark.targetId) return;
  if (markTarget(config, state, derived)) return;
  const isCurrent = mark.kind === 'site' && mark.targetId === state.siteId;
  state.mark = null;
  if (!isCurrent) onEvent?.({ type: 'unmarked' });
}

export function moveOn(
  config: GameConfig,
  state: GameState,
  derived: DerivedValues,
  onEvent?: GameEventHandler,
): void {
  if (state.travel) return;
  const site = currentSite(state);
  let ripe = state.leaveRequested || !site || site.dead;
  const best = bestAlternative(config, state, derived);
  if (site && !site.dead && availableFood(config, site) <= 0) ripe = true;
  if (
    site &&
    !site.dead &&
    best &&
    Math.min(derived.eatRate, availableFood(config, site) / config.dt) < best.average
  )
    ripe = true;
  if (!ripe) return;
  const target: TravelTarget | null =
    markTarget(config, state, derived) ?? (best ? { kind: 'site', site: best.site } : null);
  if (target) {
    if (state.leaveRequested) state.stats.leaves++;
    depart(config, state, target, onEvent);
  } else if (state.leaveRequested) {
    state.leaveRequested = false;
    onEvent?.({ type: 'noTarget' });
  }
}

export function toggleMark(
  config: GameConfig,
  state: GameState,
  kind: TargetKind,
  targetId: number,
): MarkResult {
  const derived = derive(config, state);
  if (state.mark && state.mark.kind === kind && state.mark.targetId === targetId) {
    state.mark = null;
    return 'unmarked';
  }
  if (kind === 'site') {
    const site = getSite(state, targetId);
    if (!site) return 'notFound';
    if (site.id === state.siteId) return 'currentSite';
    if (site.dead) return 'dried';
    if (!isSiteTargetable(config, state, site, derived.thrust)) return 'unreachable';
    state.mark = { kind, targetId };
    state.stats.marks++;
    return travelRate(config, state, site, derived).available <= 0
      ? 'markedDriesBeforeArrival'
      : 'marked';
  }
  const find = getFind(state, targetId);
  if (!find) return 'notFound';
  if (!isFindTargetable(config, state, find, derived.thrust)) return 'unreachable';
  state.mark = { kind, targetId };
  state.stats.marks++;
  return 'marked';
}

export function clearMark(state: GameState): boolean {
  if (!state.mark) return false;
  state.mark = null;
  return true;
}

export function requestLeave(state: GameState): boolean {
  if (!currentSite(state)) return false;
  state.leaveRequested = true;
  return true;
}

export function travelRemainingTime(
  travel: Pick<Travel, 'distance' | 'covered'>,
  speed: number,
): number {
  return (travel.distance - travel.covered) / speed;
}

export function travelProgress(travel: Pick<Travel, 'distance' | 'covered'>): number {
  return travel.distance > 0 ? Math.min(travel.distance, travel.covered) / travel.distance : 1;
}

export function travelDestination(
  state: Pick<GameState, 'travel' | 'sites' | 'finds'>,
): TravelTarget | null {
  const travel = state.travel;
  if (!travel) return null;
  if (travel.kind === 'site') {
    const site = getSite(state, travel.targetId);
    return site ? { kind: 'site', site } : null;
  }
  const find = getFind(state, travel.targetId);
  return find ? { kind: 'find', find } : null;
}
