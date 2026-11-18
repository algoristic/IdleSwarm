import { Num } from '../num/num';
import { seedToRngState } from '../rng/rng';
import { createInitialState, STATE_VERSION } from './game-state';

describe('createInitialState', () => {
  const NOW = 1_700_000_000_000;
  const state = createInitialState({ seed: 'idleswarm', now: NOW });

  it('setzt Version, Seed und Ära', () => {
    expect(STATE_VERSION).toBe(1);
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

  it('startet alle Ressourcen und Einheiten mit null', () => {
    expect(state.res.food).toBe(Num.ZERO);
    expect(state.res.dna).toBe(Num.ZERO);
    expect(state.units.queens).toBe(Num.ZERO);
    expect(state.units.drones).toBe(Num.ZERO);
    expect(state.units.soldiers).toBe(Num.ZERO);
  });

  it('enthält nur die Felder von Version 1', () => {
    expect(Object.keys(state).sort()).toEqual(
      ['era', 'res', 'rngState', 'seed', 'time', 'units', 'version'].sort(),
    );
    expect(Object.keys(state.res).sort()).toEqual(['dna', 'food']);
    expect(Object.keys(state.units).sort()).toEqual(['drones', 'queens', 'soldiers']);
  });

  it('teilt keine veränderlichen Teilobjekte zwischen zwei Zuständen', () => {
    const other = createInitialState({ seed: 'idleswarm', now: NOW });
    expect(other).not.toBe(state);
    expect(other.time).not.toBe(state.time);
    expect(other.res).not.toBe(state.res);
    expect(other.units).not.toBe(state.units);
  });

  it('serialisiert Mengen über Num.toJSON', () => {
    expect(JSON.parse(JSON.stringify(state))).toEqual({
      version: 1,
      seed: 'idleswarm',
      rngState: 1378881061,
      time: { now: NOW, lastSaved: NOW, played: 0 },
      era: 'ursuppe',
      res: { food: '0e0', dna: '0e0' },
      units: { queens: '0e0', drones: '0e0', soldiers: '0e0' },
    });
  });
});
