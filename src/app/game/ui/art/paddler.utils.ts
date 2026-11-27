import { lcg } from './shape.utils';

export interface PaddlerParams {
  radius: number;
  duration: number;
  reverse: boolean;
  start: number;
  roll: number;
  paddleDelay: number;
  rollDelay: number;
}

export function paddlerParams(
  index: number,
  minRadius: number,
  radiusRange: number,
): PaddlerParams {
  const random = lcg(index * 7919 + 13);
  const radius = minRadius + random() * radiusRange;
  const duration = 8 + random() * 8;
  const reverse = random() < 0.4;
  const start = random() * 360;
  const roll = 0.8 + random() * 0.6;
  return {
    radius,
    duration,
    reverse,
    start,
    roll,
    paddleDelay: random() * duration,
    rollDelay: random(),
  };
}
