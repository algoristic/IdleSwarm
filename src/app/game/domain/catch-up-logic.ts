import { CatchUpProgressHandler, CatchUpSummary } from './models/catch-up.model';
import { FindId } from './models/find.model';
import { GameConfig } from './models/game-config.model';
import { GameEvent } from './models/game-event.model';
import { GameState } from './models/game-state.model';
import { step } from './step-logic';

export const CATCH_UP_MIN_HIDDEN_SECONDS = 2;
export const CATCH_UP_SUMMARY_MIN_SECONDS = 60;
export const CATCH_UP_CHUNK_STEPS = 20000;

export function catchUpSteps(config: GameConfig, seconds: number): number {
  return Math.floor(Math.min(seconds, config.offlineMax) / config.dt);
}

export function needsCatchUp(hiddenSeconds: number): boolean {
  return hiddenSeconds > CATCH_UP_MIN_HIDDEN_SECONDS;
}

export function showsCatchUpProgress(steps: number): boolean {
  return steps > CATCH_UP_CHUNK_STEPS;
}

export function showsCatchUpSummary(summary: CatchUpSummary): boolean {
  return summary.seconds >= CATCH_UP_SUMMARY_MIN_SECONDS;
}

export function catchUp(
  config: GameConfig,
  state: GameState,
  seconds: number,
  onProgress?: CatchUpProgressHandler,
): CatchUpSummary | null {
  const steps = catchUpSteps(config, seconds);
  if (steps <= 0) return null;
  const totalHarvestBefore = state.stats.totalHarvest;
  const idleTimeBefore = state.stats.idleTime;
  const eatersBefore = state.units[0];
  let arrivals = 0;
  let driedSites = 0;
  const zones: number[] = [];
  const finds: FindId[] = [];
  const collect = (event: GameEvent): void => {
    if (event.type === 'arrived') arrivals++;
    else if (event.type === 'zoneChanged') zones.push(event.to);
    else if (event.type === 'siteDried') driedSites++;
    else if (event.type === 'findCollected') finds.push(event.findType);
  };
  for (let i = 0; i < steps; i += CATCH_UP_CHUNK_STEPS) {
    const n = Math.min(CATCH_UP_CHUNK_STEPS, steps - i);
    for (let j = 0; j < n; j++) step(config, state, collect);
    onProgress?.(i + n, steps);
  }
  return {
    seconds,
    simulatedSeconds: steps * config.dt,
    capped: seconds > config.offlineMax,
    steps,
    harvested: state.stats.totalHarvest - totalHarvestBefore,
    food: state.food,
    arrivals,
    zones,
    driedSites,
    idleTime: state.stats.idleTime - idleTimeBefore,
    finds,
    eatersBefore,
    eatersAfter: state.units[0],
  };
}

export function mergeCatchUpSummaries(a: CatchUpSummary, b: CatchUpSummary): CatchUpSummary {
  return {
    seconds: a.seconds + b.seconds,
    simulatedSeconds: a.simulatedSeconds + b.simulatedSeconds,
    capped: a.capped || b.capped,
    steps: a.steps + b.steps,
    harvested: a.harvested + b.harvested,
    food: b.food,
    arrivals: a.arrivals + b.arrivals,
    zones: [...a.zones, ...b.zones],
    driedSites: a.driedSites + b.driedSites,
    idleTime: a.idleTime + b.idleTime,
    finds: [...a.finds, ...b.finds],
    eatersBefore: a.eatersBefore,
    eatersAfter: b.eatersAfter,
  };
}
