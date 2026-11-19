import { DEFAULT_BALANCE } from '@app/balance/domain/constants';

import { defaultModelParams, DURATIONS_MS, sameSimConfig, toSimConfig } from './model-params-logic';
import type { ModelParamsValue } from './models/model-params.model';

describe('model-params-logic', () => {
  const defaults = defaultModelParams(DEFAULT_BALANCE);
  const withParam = (key: string, text: string): ModelParamsValue => ({
    ...defaults,
    params: { ...defaults.params, [key]: text },
  });

  it('bietet 1 h, 6 h, 24 h und 7 d an', () => {
    expect(DURATIONS_MS).toEqual([3_600_000, 21_600_000, 86_400_000, 604_800_000]);
  });

  it('startet mit festem Seed, 24 h, Aktiv und Idle und Standardwerten', () => {
    expect(toSimConfig(defaults, DEFAULT_BALANCE)).toEqual({
      seed: 'modell',
      durationMs: 86_400_000,
      bots: [{ kind: 'active' }, { kind: 'idle' }],
      params: {},
    });
    expect(defaults.params.droneCostGrowth).toBe('1,07');
  });

  it('übernimmt die gewählten Bots in fester Reihenfolge', () => {
    const bots = { active: false, idle: true, 'drone-heavy': true, 'soldier-heavy': true };
    expect(toSimConfig({ ...defaults, bots }, DEFAULT_BALANCE)?.bots).toEqual([
      { kind: 'idle' },
      { kind: 'drone-heavy' },
      { kind: 'soldier-heavy' },
    ]);
  });

  it('übernimmt nur geänderte Konstanten, auch mit Komma', () => {
    expect(toSimConfig(withParam('droneCost', '12,5'), DEFAULT_BALANCE)?.params).toEqual({
      droneCost: 12.5,
    });
  });

  it('liefert bei ungültigen Eingaben keine Konfiguration', () => {
    expect(toSimConfig(withParam('droneCost', 'abc'), DEFAULT_BALANCE)).toBeNull();
    expect(toSimConfig({ ...defaults, seed: '  ' }, DEFAULT_BALANCE)).toBeNull();
    expect(
      toSimConfig(
        {
          ...defaults,
          bots: { active: false, idle: false, 'drone-heavy': false, 'soldier-heavy': false },
        },
        DEFAULT_BALANCE,
      ),
    ).toBeNull();
  });

  it('liefert bei widersprüchlichen Konstanten keine Konfiguration', () => {
    expect(toSimConfig(withParam('candidateMinDistance', '8'), DEFAULT_BALANCE)).toBeNull();
    expect(toSimConfig(withParam('maxAutoThreshold', '0'), DEFAULT_BALANCE)).not.toBeNull();
    expect(toSimConfig(withParam('defaultAutoThreshold', '0,95'), DEFAULT_BALANCE)).toBeNull();
    const params = { ...defaults.params };
    for (const key of Object.keys(params) as (keyof typeof params)[]) {
      if (key.endsWith('Weight')) {
        params[key] = '0';
      }
    }
    expect(toSimConfig({ ...defaults, params }, DEFAULT_BALANCE)).toBeNull();
  });

  it('liefert ohne Fundgewicht an einem Typ keine Konfiguration', () => {
    // Alle an `whale-fall` möglichen Fundeinträge (Game-Design §4.16).
    const whaleFallWeights = [
      'foreignDnaWeight',
      'nutrientBubbleWeight',
      'planktonBloomWeight',
      'warmCurrentWeight',
      'primalCrystalWeight',
      'boneSplinterWeight',
      'fatPearlWeight',
      'toothScaleWeight',
      'pumiceWeight',
      'foamBallWeight',
      'clayBeadWeight',
    ] as const;
    const params = { ...defaults.params };
    for (const key of whaleFallWeights) {
      params[key] = '0';
    }
    expect(toSimConfig({ ...defaults, params }, DEFAULT_BALANCE)).toBeNull();
    expect(
      toSimConfig({ ...defaults, params: { ...params, toothScaleWeight: '1' } }, DEFAULT_BALANCE),
    ).not.toBeNull();
  });

  it('wertet gleichwertige Eingaben als dieselbe Konfiguration', () => {
    const a = toSimConfig(withParam('droneCost', '10'), DEFAULT_BALANCE);
    const b = toSimConfig(withParam('droneCost', '10,0'), DEFAULT_BALANCE);
    expect(sameSimConfig(a, b)).toBe(true);
    expect(sameSimConfig(a, toSimConfig(withParam('droneCost', '11'), DEFAULT_BALANCE))).toBe(
      false,
    );
  });
});
