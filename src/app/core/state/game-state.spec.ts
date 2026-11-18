import { DEFAULT_BALANCE } from '../balance/constants';
import { seedToRngState } from '../rng/rng';
import { createInitialState, STATE_VERSION } from './game-state';

describe('createInitialState', () => {
  const NOW = 1_700_000_000_000;
  const state = createInitialState({ seed: 'idleswarm', now: NOW });

  it('setzt Version, Seed und Ära', () => {
    expect(STATE_VERSION).toBe(2);
    expect(state.version).toBe(STATE_VERSION);
    expect(state.seed).toBe('idleswarm');
    expect(state.era).toBe('ursuppe');
  });

  it('leitet den RNG-Zustand aus dem Seed ab', () => {
    expect(state.rngState).toBe(seedToRngState('idleswarm'));
  });

  it('übernimmt die Zeit vom Aufrufer', () => {
    expect(state.time).toEqual({ now: NOW, lastSaved: NOW, played: 0 });
  });

  it('setzt die Startwerte aus Game-Design §2.1', () => {
    expect(state.res.food.eq(15)).toBe(true);
    expect(state.res.dna.isZero()).toBe(true);
    expect(state.units.queens.eq(1)).toBe(true);
    expect(state.units.drones.isZero()).toBe(true);
    expect(state.units.soldiers.isZero()).toBe(true);
    expect(state.site.type).toBe('vent');
    expect(state.site.size.eq(20000)).toBe(true);
    expect(state.site.stock.eq(20000)).toBe(true);
    expect(state.bought.queens.isZero()).toBe(true);
    expect(state.bought.drones.isZero()).toBe(true);
    expect(state.bought.soldiers.isZero()).toBe(true);
  });

  it('übernimmt überschriebene Parameter', () => {
    const custom = createInitialState(
      { seed: 'idleswarm', now: NOW },
      { ...DEFAULT_BALANCE, startFood: 7, startQueens: 2, siteSize: 500 },
    );
    expect(custom.res.food.eq(7)).toBe(true);
    expect(custom.units.queens.eq(2)).toBe(true);
    expect(custom.site.size.eq(500)).toBe(true);
    expect(custom.site.stock.eq(500)).toBe(true);
  });

  it('enthält nur die Felder von Version 2', () => {
    expect(Object.keys(state).sort()).toEqual(
      ['bought', 'era', 'res', 'rngState', 'seed', 'site', 'time', 'units', 'version'].sort(),
    );
    expect(Object.keys(state.res).sort()).toEqual(['dna', 'food']);
    expect(Object.keys(state.units).sort()).toEqual(['drones', 'queens', 'soldiers']);
    expect(Object.keys(state.site).sort()).toEqual(['size', 'stock', 'type']);
    expect(Object.keys(state.bought).sort()).toEqual(['drones', 'queens', 'soldiers']);
  });

  it('teilt keine veränderlichen Teilobjekte zwischen zwei Zuständen', () => {
    const other = createInitialState({ seed: 'idleswarm', now: NOW });
    expect(other).not.toBe(state);
    expect(other.time).not.toBe(state.time);
    expect(other.res).not.toBe(state.res);
    expect(other.units).not.toBe(state.units);
    expect(other.site).not.toBe(state.site);
    expect(other.bought).not.toBe(state.bought);
  });

  it('serialisiert Mengen über Num.toJSON', () => {
    expect(JSON.parse(JSON.stringify(state))).toEqual({
      version: 2,
      seed: 'idleswarm',
      rngState: 1378881061,
      time: { now: NOW, lastSaved: NOW, played: 0 },
      era: 'ursuppe',
      res: { food: '1.5e1', dna: '0e0' },
      units: { queens: '1e0', drones: '0e0', soldiers: '0e0' },
      site: { type: 'vent', size: '2e4', stock: '2e4' },
      bought: { queens: '0e0', drones: '0e0', soldiers: '0e0' },
    });
  });
});
