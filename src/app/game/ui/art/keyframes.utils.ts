import { Easing } from './easing.utils';

export interface Keyframes {
  values: readonly number[];
  keyTimes: readonly number[];
  easing: Easing;
}

export function evenKeyTimes(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i / (count - 1));
}

export function keyframeValue({ values, keyTimes, easing }: Keyframes, t: number): number {
  const at = t - Math.floor(t);
  let i = 0;
  while (i < keyTimes.length - 2 && at >= keyTimes[i + 1]) i++;
  const span = keyTimes[i + 1] - keyTimes[i];
  const local = span > 0 ? Math.min(1, Math.max(0, (at - keyTimes[i]) / span)) : 0;
  return values[i] + (values[i + 1] - values[i]) * easing(local);
}
