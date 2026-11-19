import { MS_PER_SECOND, SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from '../time/time-units';
import { formatNum, formatRate } from './format';

const SECONDS_FORMAT = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
const SMALL_FORMAT = new Intl.NumberFormat('de-DE', { maximumSignificantDigits: 2 });
const PERCENT_FORMAT = new Intl.NumberFormat('de-DE', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Zeitspanne in h/min/s: `20 ms`, `45 s`, `3 min 20 s`, `2 h 05 min`, `168 h`. */
export function formatElapsed(ms: number): string {
  if (ms > 0 && ms < MS_PER_SECOND / 10) {
    return `${SMALL_FORMAT.format(ms)} ms`;
  }
  const tenths = Math.round(ms / (MS_PER_SECOND / 10));
  if (tenths < 10 * SECONDS_PER_MINUTE) {
    return `${SECONDS_FORMAT.format(tenths / 10)} s`;
  }
  const seconds = Math.round(ms / MS_PER_SECOND);
  if (seconds < SECONDS_PER_HOUR) {
    const rest = seconds % SECONDS_PER_MINUTE;
    const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
    return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
  }
  const hours = Math.floor(seconds / SECONDS_PER_HOUR);
  const minutes = Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  return minutes === 0
    ? `${formatNum(hours)} h`
    : `${formatNum(hours)} h ${String(minutes).padStart(2, '0')} min`;
}

export function formatComputeTime(ms: number): string {
  return ms < MS_PER_SECOND ? `${Math.round(ms)} ms` : formatElapsed(ms);
}

export function formatShare(share: number): string {
  return PERCENT_FORMAT.format(share);
}

/** Achsenbeschriftung; `formatRate` allein zeigt kleine Log-Teilstriche als `0,0`. */
export function formatAxisValue(value: number): string {
  const size = Math.abs(value);
  if (size > 0 && size < 0.1) {
    return SMALL_FORMAT.format(value);
  }
  return size < 10 && !Number.isInteger(value) ? formatRate(value) : formatNum(value);
}
