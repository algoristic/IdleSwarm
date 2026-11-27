import { distance } from './geometry-logic';
import { DerivedValues } from './models/derived-values.model';
import { GameConfig } from './models/game-config.model';
import { GameEventHandler } from './models/game-event.model';
import { GameState, Point } from './models/game-state.model';
import { Site, SITE_TYPE_IDS, SiteTypeId } from './models/site.model';
import { nextRandom, pickWeighted } from './rng-logic';
import { upgradeEffect } from './upgrade-logic';

const PLACEMENT_ATTEMPTS = 40;
const DRY_SHARE = 1e-12;

export function randomSizeFactor(config: GameConfig, state: Pick<GameState, 'rngState'>): number {
  return (
    config.map.sizeFactorMin +
    nextRandom(state) * (config.map.sizeFactorMax - config.map.sizeFactorMin)
  );
}

export function createSite(
  config: GameConfig,
  state: GameState,
  type: SiteTypeId,
  zone: number,
  x: number,
  y: number,
  sizeFactor: number,
): Site {
  const siteType = config.siteTypes[type];
  const reference =
    Math.max(
      config.zones[zone].threshold,
      upgradeEffect(config, 'flagella', state.upgradeRanks.flagella),
    ) / config.upgrades.flagella.base;
  const base = siteType.goal
    ? config.map.goalBase
    : config.map.baseSize * reference ** config.map.ramp;
  const size = base * siteType.factor * sizeFactor;
  return {
    id: state.nextId++,
    type,
    zone,
    x,
    y,
    size,
    stock: size,
    bornAt: state.time,
    dead: false,
    removeAt: null,
    discovered: false,
    shape: Math.floor(nextRandom(state) * 1e6),
  };
}

export function placeInDisc(
  config: GameConfig,
  state: GameState,
  zone: number,
  centerX: number,
  centerY: number,
  radius: number,
): Point {
  let best: Point | null = null;
  let bestDistance = -1;
  for (let i = 0; i < PLACEMENT_ATTEMPTS; i++) {
    const angle = nextRandom(state) * Math.PI * 2;
    const r = Math.sqrt(nextRandom(state)) * radius;
    const point = { x: centerX + Math.cos(angle) * r, y: centerY + Math.sin(angle) * r };
    if (Math.hypot(point.x, point.y) > config.map.zoneRadius) continue;
    let d = distance(point, state.position);
    for (const other of state.sites)
      if (other.zone === zone) d = Math.min(d, distance(point, other));
    if (d >= config.map.minDistance) return point;
    if (d > bestDistance) {
      bestDistance = d;
      best = point;
    }
  }
  return best ?? { x: centerX, y: centerY };
}

export function isZoneInRange(state: Pick<GameState, 'zone'>, zone: number): boolean {
  return zone === state.zone || zone === state.zone + 1;
}

export function discover(state: GameState, reach: number): void {
  for (const site of state.sites) {
    if (
      !site.discovered &&
      isZoneInRange(state, site.zone) &&
      distance(state.position, site) <= reach
    ) {
      site.discovered = true;
    }
  }
}

export function getSite(state: Pick<GameState, 'sites'>, id: number): Site | null {
  return state.sites.find((site) => site.id === id) ?? null;
}

export function currentSite(state: Pick<GameState, 'sites' | 'siteId' | 'travel'>): Site | null {
  return state.siteId != null && !state.travel ? getSite(state, state.siteId) : null;
}

export function availableFood(config: GameConfig, site: Site): number {
  const siteType = config.siteTypes[site.type];
  if (site.dead) return 0;
  return siteType.floorFraction
    ? Math.max(0, site.stock - siteType.floorFraction * site.size)
    : site.stock;
}

export function siteThreshold(config: GameConfig, site: Site): number {
  return Math.max(config.zones[site.zone].threshold, config.siteTypes[site.type].threshold || 0);
}

export function isSiteReachable(config: GameConfig, site: Site, thrust: number): boolean {
  return thrust >= siteThreshold(config, site);
}

export function isSiteTargetable(
  config: GameConfig,
  state: Pick<GameState, 'zone'>,
  site: Site | null,
  thrust: number,
): site is Site {
  return (
    site !== null &&
    site.discovered &&
    !site.dead &&
    isZoneInRange(state, site.zone) &&
    isSiteReachable(config, site, thrust)
  );
}

export function availableAtArrival(
  config: GameConfig,
  state: Pick<GameState, 'time'>,
  site: Site,
  travelTime: number,
): number {
  const siteType = config.siteTypes[site.type];
  let available = availableFood(config, site);
  if (siteType.lifetime && site.bornAt + siteType.lifetime <= state.time + travelTime) return 0;
  if (siteType.decay) {
    available *= Math.exp(-siteType.decay * travelTime);
    if (available < (siteType.minFraction ?? Number.NaN) * site.size) return 0;
  }
  return available;
}

export function drySite(
  config: GameConfig,
  state: GameState,
  site: Site,
  onEvent?: GameEventHandler,
): void {
  site.dead = true;
  site.stock = 0;
  site.removeAt =
    state.siteId === site.id && !state.travel ? null : state.time + config.map.removeDelay;
  state.stats.driedSites++;
  onEvent?.({ type: 'siteDried', siteId: site.id, siteType: site.type });
}

export function spawnSite(config: GameConfig, state: GameState, zone: number, reach: number): void {
  const type = pickWeighted(state, config.spawn.weights, SITE_TYPE_IDS);
  const point = placeInDisc(config, state, zone, state.position.x, state.position.y, reach);
  const site = createSite(
    config,
    state,
    type,
    zone,
    point.x,
    point.y,
    randomSizeFactor(config, state),
  );
  site.discovered = true;
  state.sites.push(site);
  state.stats.spawnedSites++;
}

export function updateSites(
  config: GameConfig,
  state: GameState,
  onEvent?: GameEventHandler,
): void {
  const dt = config.dt;
  for (const site of state.sites) {
    if (site.dead) continue;
    const siteType = config.siteTypes[site.type];
    if (siteType.lifetime && state.time - site.bornAt >= siteType.lifetime) {
      drySite(config, state, site, onEvent);
      continue;
    }
    if (siteType.decay) site.stock *= Math.exp(-siteType.decay * dt);
    if (siteType.growth && site.stock > 0)
      site.stock += siteType.growth * site.stock * (1 - site.stock / site.size) * dt;
    if (siteType.minFraction && site.stock < siteType.minFraction * site.size) {
      drySite(config, state, site, onEvent);
      continue;
    }
    if (!siteType.floorFraction && site.stock <= site.size * DRY_SHARE)
      drySite(config, state, site, onEvent);
  }
}

export function removeGoneSites(state: GameState, onEvent?: GameEventHandler): void {
  const isGone = (site: Site): boolean => site.removeAt != null && state.time >= site.removeAt;
  if (!state.sites.some(isGone)) return;
  const gone = new Set(state.sites.filter(isGone).map((site) => site.id));
  state.sites = state.sites.filter((site) => !gone.has(site.id));
  if (state.travel && state.travel.kind === 'site' && gone.has(state.travel.targetId)) {
    state.travel = null;
    state.siteId = null;
    onEvent?.({ type: 'travelAborted' });
  }
}

export function spawnNewSites(
  config: GameConfig,
  state: GameState,
  derived: Pick<DerivedValues, 'thrust' | 'reach'>,
): void {
  const last = config.zones.length - 1;
  for (const zone of [state.zone, state.zone + 1]) {
    if (zone > last) continue;
    state.spawnTimers[zone] += config.dt;
    if (state.spawnTimers[zone] >= config.spawn.interval) {
      state.spawnTimers[zone] -= config.spawn.interval;
      const inReach = state.sites.filter(
        (site) =>
          site.zone === zone &&
          !site.dead &&
          !config.siteTypes[site.type].goal &&
          distance(state.position, site) <= derived.reach,
      ).length;
      if (inReach < config.spawn.maxInReach) spawnSite(config, state, zone, derived.reach);
    }
  }
  for (let guard = 0; guard < config.spawn.minTargets; guard++) {
    const targets = state.sites.filter(
      (site) =>
        site.id !== state.siteId &&
        isSiteTargetable(config, state, site, derived.thrust) &&
        distance(state.position, site) <= derived.reach,
    ).length;
    if (targets >= config.spawn.minTargets) break;
    const next =
      state.zone + 1 <= last && derived.thrust >= config.zones[state.zone + 1].threshold
        ? state.zone + 1
        : state.zone;
    spawnSite(config, state, next, derived.reach);
  }
}
