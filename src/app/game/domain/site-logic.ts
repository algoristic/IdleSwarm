import { distance } from './geometry-logic';
import { GameConfig } from './models/game-config.model';
import { GameState, Point } from './models/game-state.model';
import { Site, SiteTypeId } from './models/site.model';
import { nextRandom } from './rng-logic';
import { upgradeEffect } from './upgrade-logic';

const PLACEMENT_ATTEMPTS = 40;

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
