import {
  catchUp,
  catchUpSteps,
  mergeCatchUpSummaries,
  needsCatchUp,
  showsCatchUpProgress,
  showsCatchUpSummary,
} from './catch-up-logic';
import { newGame } from './new-game-logic';
import { PROTOTYPE_GAME_CONFIG } from './prototype-game-config.fixture';
import { step } from './step-logic';
import { requestLeave } from './travel-logic';

const config = PROTOTYPE_GAME_CONFIG;
const NOW = 1_700_000_000_000;

describe('catchUpSteps', () => {
  it('divides the seconds by dt and caps them at offlineMax', () => {
    expect(catchUpSteps(config, 10.3)).toBe(41);
    expect(catchUpSteps(config, 100000)).toBe(345600);
  });
});

describe('catchUp', () => {
  it('returns null without a whole step', () => {
    const state = newGame(config, 19, NOW);
    expect(catchUp(config, state, 0)).toBeNull();
    expect(catchUp(config, state, 0.2)).toBeNull();
    expect(state).toEqual(newGame(config, 19, NOW));
  });

  it('caps the time at offlineMax', () => {
    const shortConfig = { ...config, offlineMax: 10 };
    const summary = catchUp(shortConfig, newGame(config, 19, NOW), 100);
    expect(summary?.steps).toBe(40);
    expect(summary?.simulatedSeconds).toBe(10);
    expect(summary?.capped).toBe(true);
    expect(summary?.seconds).toBe(100);
  });

  it('runs the same steps as the time step and summarizes the state after', () => {
    const state = newGame(config, 19, NOW);
    const expected = newGame(config, 19, NOW);
    const progress: [number, number][] = [];
    const summary = catchUp(config, state, 5000.25, (done, total) => progress.push([done, total]));
    for (let i = 0; i < 20001; i++) step(config, expected);

    expect(state).toEqual(expected);
    expect(progress).toEqual([
      [20000, 20001],
      [20001, 20001],
    ]);
    expect(summary).toMatchObject({
      seconds: 5000.25,
      simulatedSeconds: 5000.25,
      capped: false,
      steps: 20001,
      harvested: expected.stats.totalHarvest,
      food: expected.food,
      idleTime: expected.stats.idleTime,
      eatersBefore: config.start.eaters,
      eatersAfter: expected.units[0],
    });
  });

  it('counts the events of the steps', () => {
    const state = newGame(config, 19, NOW);
    const expected = newGame(config, 19, NOW);
    requestLeave(state);
    requestLeave(expected);
    const summary = catchUp(config, state, 3000);
    let arrivals = 0;
    let driedSites = 0;
    const zones: number[] = [];
    const finds: string[] = [];
    for (let i = 0; i < 12000; i++)
      step(config, expected, (event) => {
        if (event.type === 'arrived') arrivals++;
        if (event.type === 'siteDried') driedSites++;
        if (event.type === 'zoneChanged') zones.push(event.to);
        if (event.type === 'findCollected') finds.push(event.findType);
      });
    expect(arrivals).toBeGreaterThan(0);
    expect(driedSites + finds.length).toBeGreaterThan(0);
    expect(summary).toMatchObject({ arrivals, driedSites, zones, finds });
  });
});

describe('mergeCatchUpSummaries', () => {
  it('adds the totals and keeps the first eaters and the last food', () => {
    const merged = mergeCatchUpSummaries(
      {
        seconds: 3600,
        simulatedSeconds: 3600,
        capped: false,
        steps: 14400,
        harvested: 500,
        food: 40,
        arrivals: 3,
        zones: [1],
        driedSites: 2,
        idleTime: 12,
        finds: ['feedingFrenzy'],
        eatersBefore: 5,
        eatersAfter: 9,
      },
      {
        seconds: 90.5,
        simulatedSeconds: 90,
        capped: true,
        steps: 360,
        harvested: 20,
        food: 55,
        arrivals: 1,
        zones: [2],
        driedSites: 0,
        idleTime: 3,
        finds: ['tailwind'],
        eatersBefore: 9,
        eatersAfter: 11,
      },
    );
    expect(merged).toEqual({
      seconds: 3690.5,
      simulatedSeconds: 3690,
      capped: true,
      steps: 14760,
      harvested: 520,
      food: 55,
      arrivals: 4,
      zones: [1, 2],
      driedSites: 2,
      idleTime: 15,
      finds: ['feedingFrenzy', 'tailwind'],
      eatersBefore: 5,
      eatersAfter: 11,
    });
  });
});

describe('thresholds', () => {
  it('catches up only after more than 2 hidden seconds', () => {
    expect(needsCatchUp(2)).toBe(false);
    expect(needsCatchUp(2.1)).toBe(true);
  });

  it('shows progress above one block', () => {
    expect(showsCatchUpProgress(20000)).toBe(false);
    expect(showsCatchUpProgress(20001)).toBe(true);
  });

  it('shows the summary from 60 seconds on', () => {
    const state = newGame(config, 19, NOW);
    const short = catchUp(config, state, 59.75);
    const long = catchUp(config, state, 60);
    expect(short && showsCatchUpSummary(short)).toBe(false);
    expect(long && showsCatchUpSummary(long)).toBe(true);
  });
});
