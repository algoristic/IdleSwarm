import { createFind } from './find-logic';
import { GameConfig } from './models/game-config.model';
import { GameState, SAVE_VERSION } from './models/game-state.model';
import { SITE_TYPE_IDS } from './models/site.model';
import { createSite, discover, placeInDisc, randomSizeFactor } from './site-logic';
import { reachFor } from './upgrade-logic';

const INITIALLY_UNLOCKED_UNITS = 2;
const GOAL_SITE_RADIUS_SHARE = 0.8;

export function harvestHistoryLength(config: GameConfig): number {
  return Math.round(config.finds.averageWindow / config.dt);
}

export function newGame(config: GameConfig, seed: number, now: number): GameState {
  const zoneZeros = (): number[] => config.zones.map(() => 0);
  const state: GameState = {
    version: SAVE_VERSION,
    seed,
    rngState: seed,
    time: 0,
    food: config.start.food,
    eggs: config.start.eggs,
    units: config.units.map((_, i) => (i === 0 ? config.start.eaters : 0)),
    unlocked: config.units.map((_, i) => i < INITIALLY_UNLOCKED_UNITS),
    upgradeRanks: { hearth: 0, digestion: 0, flagella: 0, crop: 0 },
    chainRanks: config.units.slice(INITIALLY_UNLOCKED_UNITS).map(() => 0),
    freeUpgrades: 0,
    zone: 0,
    position: { x: 0, y: 0 },
    siteId: null,
    travel: null,
    sites: [],
    finds: [],
    findRespawnAt: {},
    spawnTimers: zoneZeros(),
    buffs: { feedingFrenzy: 0, layingBoost: 0, breedingFrenzy: 0, tailwind: 0 },
    mark: null,
    leaveRequested: false,
    nextId: 1,
    harvestHistory: new Array<number>(harvestHistoryLength(config)).fill(0),
    harvestHistoryIndex: 0,
    harvestHistorySum: 0,
    lastHarvestRate: 0,
    stats: {
      firstTravelAt: null,
      travels: 0,
      driedSites: 0,
      spawnedSites: 0,
      collectedFinds: 0,
      marks: 0,
      leaves: 0,
      idleTime: 0,
      idleTimeByZone: zoneZeros(),
      timeByZone: zoneZeros(),
      totalHarvest: 0,
      endedAt: null,
    },
    ended: false,
    endSeen: false,
    savedAt: now,
  };
  const start = createSite(config, state, 'algae', 0, 0, 0, config.map.startSizeFactor);
  start.discovered = true;
  state.sites.push(start);
  state.siteId = start.id;
  for (let zone = 0; zone < config.zones.length; zone++) {
    for (const type of SITE_TYPE_IDS) {
      const count = config.map.initialSites[type] ?? 0;
      for (let i = 0; i < count; i++) {
        const point = placeInDisc(config, state, zone, 0, 0, config.map.zoneRadius);
        state.sites.push(
          createSite(config, state, type, zone, point.x, point.y, randomSizeFactor(config, state)),
        );
      }
    }
    if (zone === config.siteTypes.seagrass.zone) {
      const point = placeInDisc(
        config,
        state,
        zone,
        0,
        0,
        config.map.zoneRadius * GOAL_SITE_RADIUS_SHARE,
      );
      state.sites.push(
        createSite(
          config,
          state,
          'seagrass',
          zone,
          point.x,
          point.y,
          randomSizeFactor(config, state),
        ),
      );
    }
    state.finds.push(createFind(config, state, zone));
  }
  discover(state, reachFor(config, state.upgradeRanks.flagella));
  return state;
}
