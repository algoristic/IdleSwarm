import { BalanceParams, DEFAULT_BALANCE } from '@app/balance/domain/constants';

import { changedParams, formatParam, paramFields, paramsToJson, parseParam } from './params-logic';

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

  it('begrenzt den Brutanteil auf 0 bis 1', () => {
    const fields = paramFields(DEFAULT_BALANCE, { broodDroneShare: '1,5' });
    expect(fields.find((f) => f.key === 'broodDroneShare')?.value).toBeNull();
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
