import { advanceClock, isSaveDue } from './loop-logic';
import { PROTOTYPE_GAME_CONFIG } from './prototype-game-config.fixture';

const config = PROTOTYPE_GAME_CONFIG;

describe('advanceClock', () => {
  it('runs whole steps and keeps the remainder', () => {
    const result = advanceClock(config, 0, 0.6, 1);
    expect(result.steps).toBe(2);
    expect(result.accumulator).toBeCloseTo(0.1, 10);
    expect(result.elapsed).toBe(0.6);
  });

  it('carries the accumulator into the next frame', () => {
    const result = advanceClock(config, 0.2, 0.05, 1);
    expect(result.steps).toBe(1);
    expect(result.accumulator).toBeCloseTo(0, 10);
  });

  it('caps the elapsed time of a frame at one second', () => {
    expect(advanceClock(config, 0, 5, 1)).toEqual({ steps: 4, accumulator: 0, elapsed: 1 });
  });

  it('multiplies the elapsed time by the tempo', () => {
    const result = advanceClock(config, 0, 0.1, 100);
    expect(result.steps).toBe(40);
    expect(result.accumulator).toBeCloseTo(0, 10);
    expect(result.elapsed).toBe(0.1);
  });

  it('stops at 2000 steps and drops the rest', () => {
    expect(advanceClock(config, 0, 1, 1000)).toEqual({ steps: 2000, accumulator: 0, elapsed: 1 });
  });
});

describe('isSaveDue', () => {
  it('is due from the save interval on', () => {
    expect(isSaveDue(config, 9.9)).toBe(false);
    expect(isSaveDue(config, 10)).toBe(true);
  });
});
