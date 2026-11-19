import { BUY_GAP_WINDOW_MS } from '@app/engine/domain/runner-logic';

import {
  isWithinBand,
  PACING_TARGETS,
  pacingTargetsFor,
  pacingUnitMs,
  pacingWindowMs,
} from './targets';

describe('Zielbänder (Projektplan §3.5)', () => {
  it('stehen wörtlich wie im Projektplan, nur für Aktiv und Idle', () => {
    const text = PACING_TARGETS.map(({ id, bot, band }) => {
      const min = band.min === null ? '' : `${band.min.inclusive ? '≥' : '>'}${band.min.value}`;
      const max = band.max === null ? '' : `${band.max.inclusive ? '≤' : '<'}${band.max.value}`;
      return `${id}/${bot}: ${min} ${max} ${band.unit}`;
    });
    expect(text).toEqual([
      'firstDecision/active:  <10 second',
      'buyInterval/active: ≥5 ≤60 second',
      'buyInterval/idle:  <5 minute',
      'siteDuration/active: ≥3 ≤15 minute',
      'siteDuration/idle: ≥10 ≤60 minute',
      'longestDrought/active:  <10 minute',
      'longestDrought/idle:  <60 minute',
      'newMechanic/active: ≥5 ≤15 minute',
    ]);
    expect(pacingTargetsFor('drone-heavy')).toEqual([]);
  });

  it('misst jede Kennzahl über mindestens eine Größe', () => {
    expect(PACING_TARGETS.every((target) => target.checks.length > 0)).toBe(true);
  });

  it('nutzt für „erste 30 min“ dasselbe Fenster wie der Runner', () => {
    const buyInterval = PACING_TARGETS.filter((target) => target.id === 'buyInterval');
    for (const { window } of buyInterval) {
      expect(window === null ? null : pacingWindowMs(window)).toBe(BUY_GAP_WINDOW_MS);
    }
  });

  it('prüft Grenzen nach „<“ und „≤“', () => {
    const s = pacingUnitMs('second');
    const band = { min: { value: 5, inclusive: true }, max: { value: 60, inclusive: true } };
    expect(isWithinBand(5 * s, { ...band, unit: 'second' })).toBe(true);
    expect(isWithinBand(60 * s, { ...band, unit: 'second' })).toBe(true);
    expect(isWithinBand(4.9 * s, { ...band, unit: 'second' })).toBe(false);
    expect(isWithinBand(61 * s, { ...band, unit: 'second' })).toBe(false);
    // Nur die Obergrenze, wie „≤ 60 s“ über die längste Wartezeit.
    expect(isWithinBand(1 * s, { ...band, unit: 'second' }, true)).toBe(true);
    const below = { min: null, max: { value: 10, inclusive: false }, unit: 'second' as const };
    expect(isWithinBand(9_999, below)).toBe(true);
    expect(isWithinBand(10_000, below)).toBe(false);
  });
});
