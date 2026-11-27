import { BuffId, FindId } from './find.model';
import { SiteTypeId } from './site.model';
import { UnitId } from './unit.model';
import { UpgradeId } from './upgrade.model';
import { ZoneId } from './zone.model';

export interface StartConfig {
  readonly food: number;
  readonly eggs: number;
  readonly eaters: number;
}

export interface UnitConfig {
  readonly id: UnitId;
  readonly cost: number;
  readonly requirement: number;
  readonly production: number;
}

export interface UpgradeConfig {
  readonly base: number;
  readonly factor: number;
  readonly cost: number;
  readonly growth: number;
}

export interface ChainUpgradeConfig {
  readonly enabled: boolean;
  readonly effectPerRank: number;
  readonly baseCost: number;
  readonly costGrowth: number;
}

export interface ReachConfig {
  readonly base: number;
  readonly step: number;
  readonly every: number;
}

export interface TravelConfig {
  readonly base: number;
  readonly reference: number;
}

export interface ZoneConfig {
  readonly id: ZoneId;
  readonly threshold: number;
}

export interface MapConfig {
  readonly baseSize: number;
  readonly ramp: number;
  readonly goalBase: number;
  readonly sizeFactorMin: number;
  readonly sizeFactorMax: number;
  readonly startSizeFactor: number;
  readonly zoneRadius: number;
  readonly minDistance: number;
  readonly initialSites: Readonly<Partial<Record<SiteTypeId, number>>>;
  readonly removeDelay: number;
}

export interface SiteTypeConfig {
  readonly factor: number;
  readonly growth: number;
  readonly lifetime?: number;
  readonly decay?: number;
  readonly minFraction?: number;
  readonly eggMultiplier?: number;
  readonly threshold?: number;
  readonly floorFraction?: number;
  readonly goal?: boolean;
  readonly zone?: number;
}

export interface SpawnConfig {
  readonly interval: number;
  readonly maxInReach: number;
  readonly minTargets: number;
  readonly weights: Readonly<Partial<Record<SiteTypeId, number>>>;
}

export interface FindsConfig {
  readonly respawnMin: number;
  readonly respawnMax: number;
  readonly weights: Readonly<Record<FindId, number>>;
  readonly buffDuration: number;
  readonly multipliers: Readonly<Record<BuffId, number>>;
  readonly foodBubbleMin: number;
  readonly foodBubbleSeconds: number;
  readonly averageWindow: number;
  readonly eggBallMin: number;
  readonly eggBallSeconds: number;
  readonly growthSpurtSeconds: number;
}

export interface GameConfig {
  readonly dt: number;
  readonly start: StartConfig;
  readonly units: readonly UnitConfig[];
  readonly upgrades: Readonly<Record<UpgradeId, UpgradeConfig>>;
  readonly chainUpgrade: ChainUpgradeConfig;
  readonly reach: ReachConfig;
  readonly travel: TravelConfig;
  readonly zones: readonly ZoneConfig[];
  readonly map: MapConfig;
  readonly siteTypes: Readonly<Record<SiteTypeId, SiteTypeConfig>>;
  readonly spawn: SpawnConfig;
  readonly finds: FindsConfig;
  readonly offlineMax: number;
  readonly saveInterval: number;
}
