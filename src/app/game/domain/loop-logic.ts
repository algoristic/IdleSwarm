import { GameConfig } from './models/game-config.model';

export const MAX_FRAME_SECONDS = 1;
export const MAX_STEPS_PER_FRAME = 2000;

export interface ClockAdvance {
  steps: number;
  accumulator: number;
  elapsed: number;
}

export function advanceClock(
  config: GameConfig,
  accumulator: number,
  elapsedSeconds: number,
  tempo: number,
): ClockAdvance {
  const elapsed = Math.min(elapsedSeconds, MAX_FRAME_SECONDS);
  let acc = accumulator + elapsed * tempo;
  let steps = 0;
  while (acc >= config.dt && steps < MAX_STEPS_PER_FRAME) {
    acc -= config.dt;
    steps++;
  }
  if (steps >= MAX_STEPS_PER_FRAME) acc = 0;
  return { steps, accumulator: acc, elapsed };
}

export function isSaveDue(config: GameConfig, sinceSave: number): boolean {
  return sinceSave >= config.saveInterval;
}
