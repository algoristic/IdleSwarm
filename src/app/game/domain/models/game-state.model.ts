import { BuffId, Find } from './find.model';
import { Site } from './site.model';
import { TargetKind, Travel } from './travel.model';
import { UpgradeId } from './upgrade.model';

export const SAVE_VERSION = 1;

export interface Point {
  x: number;
  y: number;
}

export interface Mark {
  kind: TargetKind;
  id: number;
}

export interface GameStats {
  firstTravelAt: number | null;
  travels: number;
  driedSites: number;
  spawnedSites: number;
  collectedFinds: number;
  marks: number;
  leaves: number;
  idleTime: number;
  idleTimeByZone: number[];
  timeByZone: number[];
  totalHarvest: number;
  endedAt: number | null;
}

export interface GameState {
  version: number;
  seed: number;
  rngState: number;
  time: number;
  food: number;
  eggs: number;
  units: number[];
  unlocked: boolean[];
  upgradeRanks: Record<UpgradeId, number>;
  chainRanks: number[];
  freeUpgrades: number;
  zone: number;
  position: Point;
  siteId: number | null;
  travel: Travel | null;
  sites: Site[];
  finds: Find[];
  findRespawnAt: Partial<Record<number, number>>;
  spawnTimers: number[];
  buffs: Record<BuffId, number>;
  mark: Mark | null;
  leaveRequested: boolean;
  nextId: number;
  harvestHistory: number[];
  harvestHistoryIndex: number;
  harvestHistorySum: number;
  lastHarvestRate: number;
  stats: GameStats;
  ended: boolean;
  endSeen: boolean;
  savedAt: number;
}
