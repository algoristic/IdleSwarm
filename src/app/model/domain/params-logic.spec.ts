import { BalanceParams, DEFAULT_BALANCE } from '@app/balance/domain/constants';

import {
  changedParams,
  formatParam,
  paramConflicts,
  ParamDrafts,
  paramFields,
  paramLimit,
  paramsToJson,
  parseParam,
} from './params-logic';

describe('parseParam', () => {
  it.each([
    ['10', 10],
    [' 1,07 ', 1.07],
    ['1.07', 1.07],
    ['0', 0],
    ['1e3', 1000],
    ['.5', 0.5],
  ])('liest %s', (text, expected) => {
    expect(parseParam(text)).toBe(expected);
  });

  it.each(['', ' ', 'abc', '1,2,3', '-1', 'Infinity', '1e999', '0x10', '20.000', '1.000.000'])(
    'lehnt %j ab',
    (text) => {
      expect(parseParam(text)).toBeNull();
    },
  );

  it('prüft Grenzen', () => {
    expect(parseParam('1', { min: 0, max: 1 })).toBe(1);
    expect(parseParam('1,5', { min: 0, max: 1 })).toBeNull();
  });

  it('verlangt bei Zählwerten eine ganze Zahl', () => {
    const limit = { min: 1, integer: true } as const;
    expect(parseParam('6', limit)).toBe(6);
    expect(parseParam('6,0', limit)).toBe(6);
    expect(parseParam('6,5', limit)).toBeNull();
    expect(parseParam('0', limit)).toBeNull();
  });
});

describe('paramLimit', () => {
  it.each([
    'sacrificeYield',
    'minSacrificeLoss',
    'balancedMaxLossShare',
    'defaultAutoThreshold',
    'maxAutoThreshold',
    'siteSpread',
    'algalMatFindChance',
    'ventFindChance',
    'bacterialMatFindChance',
    'methaneSeepFindChance',
    'whaleFallFindChance',
  ] as const)('begrenzt den Anteil %s auf 0 bis 1', (key) => {
    expect(paramLimit(key)).toEqual({ min: 0, max: 1 });
  });

  it('verlangt ganzzahlige Zählwerte', () => {
    expect(paramLimit('candidateCount')).toEqual({ min: 1, integer: true });
    expect(paramLimit('startQueens')).toEqual({ min: 0, integer: true });
    expect(paramLimit('startPheromoneDrones')).toEqual({ min: 0, integer: true });
    expect(paramLimit('startPheromoneSoldiers')).toEqual({ min: 0, integer: true });
  });

  it('lässt Wachstumsfaktoren nach oben offen', () => {
    expect(paramLimit('droneCostGrowth')).toEqual({ min: 0 });
    expect(paramLimit('siteSizeGrowth')).toEqual({ min: 0 });
  });

  it('begrenzt Genom-Werte nach der Datenregel der Effekte (Game-Design §4.13)', () => {
    expect(paramLimit('cilia1Effect')).toEqual({ min: 0 });
    expect(paramLimit('chemotaxisEffect')).toEqual({ min: 0 });
    expect(paramLimit('secondGlandEffect')).toEqual({ min: 0, integer: true });
    expect(paramLimit('flagellumEffect')).toEqual({ min: 1 });
    expect(paramLimit('buddingEffect')).toEqual({ min: 1 });
    expect(paramLimit('nettleCellsEffect')).toEqual({ min: 0, max: 1 });
    expect(paramLimit('autophagyEffect')).toEqual({ min: 0 });
    expect(paramLimit('sulfurShellEffect')).toEqual({ min: 0 });
    expect(paramLimit('sulfurShellFragments')).toEqual({ min: 1, integer: true });
    expect(paramLimit('genomeCost')).toEqual({ min: 0 });
    expect(paramLimit('genomeCostGrowth')).toEqual({ min: 0 });
  });

  it('begrenzt Fund- und Badge-Werte (Game-Design §4.16, §4.17)', () => {
    expect(paramLimit('findHarvestDraws')).toEqual({ min: 0, integer: true });
    expect(paramLimit('findSpread')).toEqual({ min: 0, max: 1 });
    expect(paramLimit('nutrientBubbleShare')).toEqual({ min: 0, max: 1 });
    expect(paramLimit('foreignDnaFactor')).toEqual({ min: 0 });
    expect(paramLimit('foreignDnaWeight')).toEqual({ min: 0 });
    expect(paramLimit('pumiceWeight')).toEqual({ min: 0 });
    expect(paramLimit('planktonBloomFactor')).toEqual({ min: 1 });
    expect(paramLimit('warmCurrentSeconds')).toEqual({ min: 0 });
    expect(paramLimit('matRelicsBadgeEffect')).toEqual({ min: 0 });
    expect(paramLimit('whaleRelicsBadgeEffect')).toEqual({ min: 0, max: 1 });
    expect(paramLimit('ventFindChance')).toEqual({ min: 0, max: 1 });
  });

  it('wird von allen Standardwerten erfüllt', () => {
    expect(paramFields(DEFAULT_BALANCE, {}).filter((field) => field.value === null)).toEqual([]);
  });
});

describe('paramConflicts', () => {
  const defaults = Object.fromEntries(
    paramFields(DEFAULT_BALANCE, {}).map((field) => [field.key, field.text]),
  ) as ParamDrafts;
  const allWeights = (text: string): ParamDrafts => ({
    ...defaults,
    algalMatWeight: text,
    ventWeight: text,
    bacterialMatWeight: text,
    methaneSeepWeight: text,
    whaleFallWeight: text,
  });

  it('meldet für die Standardwerte keinen Konflikt', () => {
    expect(paramConflicts(defaults)).toEqual({});
  });

  it('meldet eine kleinste Distanz über der größten an der größten', () => {
    expect(paramConflicts({ ...defaults, candidateMinDistance: '8' })).toEqual({
      candidateMaxDistance: 'candidateDistance',
    });
    expect(
      paramConflicts({ ...defaults, candidateMinDistance: '7', candidateMaxDistance: '7' }),
    ).toEqual({});
  });

  it('meldet eine Standard-Schwelle über der höchsten an der höchsten', () => {
    expect(paramConflicts({ ...defaults, defaultAutoThreshold: '0,95' })).toEqual({
      maxAutoThreshold: 'autoThreshold',
    });
  });

  it('meldet fehlende Typgewichte an jedem Gewicht', () => {
    expect(paramConflicts(allWeights('0'))).toEqual({
      algalMatWeight: 'siteTypeWeights',
      ventWeight: 'siteTypeWeights',
      bacterialMatWeight: 'siteTypeWeights',
      methaneSeepWeight: 'siteTypeWeights',
      whaleFallWeight: 'siteTypeWeights',
    });
    expect(paramConflicts({ ...allWeights('0'), ventWeight: '0,1' })).toEqual({});
  });

  it('zählt nur die Gewichte der Typtabelle, nicht jeden Schlüssel auf „Weight“', () => {
    const drafts = { ...allWeights('0'), pheromoneWeight: '0' } as ParamDrafts;
    expect(Object.keys(paramConflicts(drafts))).toEqual([
      'algalMatWeight',
      'ventWeight',
      'bacterialMatWeight',
      'methaneSeepWeight',
      'whaleFallWeight',
    ]);
  });

  it('überlässt ungültige Eingaben der Feldprüfung', () => {
    expect(paramConflicts({ ...defaults, candidateMinDistance: 'x' })).toEqual({});
    expect(paramConflicts({ ...allWeights('0'), ventWeight: 'x' })).toEqual({});
  });
});

describe('paramFields', () => {
  it('erzeugt je Konstante ein Feld, auch für neue', () => {
    const extended = { ...DEFAULT_BALANCE, brandNew: 3 } as BalanceParams;
    const keys = paramFields(extended, {}).map((field) => field.key as string);
    expect(keys).toEqual([...Object.keys(DEFAULT_BALANCE), 'brandNew']);
  });

  it('zeigt Standardwerte deutsch und unverändert', () => {
    const field = paramFields(DEFAULT_BALANCE, {}).find((f) => f.key === 'droneCostGrowth');
    expect(field).toMatchObject({ text: '1,07', value: 1.07, changed: false });
    expect(formatParam(0.75)).toBe('0,75');
  });

  it('markiert Änderungen, aber nicht gleichwertige Schreibweisen', () => {
    const fields = paramFields(DEFAULT_BALANCE, { droneCost: '12', queenCost: '60,0' });
    expect(fields.find((f) => f.key === 'droneCost')?.changed).toBe(true);
    expect(fields.find((f) => f.key === 'queenCost')?.changed).toBe(false);
  });

  it('begrenzt Anteile auf 0 bis 1', () => {
    const fields = paramFields(DEFAULT_BALANCE, { sacrificeYield: '1,5' });
    expect(fields.find((f) => f.key === 'sacrificeYield')?.value).toBeNull();
  });

  it('verlangt ganzzahlige Pheromonpunkte beim Start', () => {
    const fields = paramFields(DEFAULT_BALANCE, { startPheromoneDrones: '2,5' });
    expect(fields.find((f) => f.key === 'startPheromoneDrones')?.value).toBeNull();
  });
});

describe('JSON-Export', () => {
  it('enthält nur gültige geänderte Werte', () => {
    const fields = paramFields(DEFAULT_BALANCE, {
      droneCost: '12,5',
      queenCost: 'x',
      siteSize: '20000',
    });
    const changed = changedParams(fields);
    expect(changed).toEqual({ droneCost: 12.5 });
    expect(JSON.parse(paramsToJson(changed))).toEqual({ droneCost: 12.5 });
  });

  it('ist ohne Änderungen leer', () => {
    expect(paramsToJson(changedParams(paramFields(DEFAULT_BALANCE, {})))).toBe('{}');
  });
});
