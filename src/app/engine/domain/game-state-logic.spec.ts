import { BALANCE_V1 } from '@app/balance/domain/balance-v1.testing';
import { nextRandom, seedToRngState } from '@app/shared/util/rng/rng';
import { generateCandidates } from '@app/site/domain/generator-logic';

import { createInitialState } from './game-state-logic';
import { STATE_VERSION } from './models/game-state.model';

describe('createInitialState', () => {
  const NOW = 1_700_000_000_000;
  const state = createInitialState({ seed: 'idleswarm', now: NOW }, BALANCE_V1);

  it('setzt Version, Seed und Ära', () => {
    expect(STATE_VERSION).toBe(5);
    expect(state.version).toBe(STATE_VERSION);
    expect(state.seed).toBe('idleswarm');
    expect(state.era).toBe('ursuppe');
  });

  it('erzeugt die Startkandidaten aus dem RNG-Zustand des Seeds und schreibt ihn fort', () => {
    const generated = generateCandidates(
      { origin: { x: 0, y: 0 }, moves: 0, range: 5, rngState: seedToRngState('idleswarm') },
      BALANCE_V1,
    );
    expect(JSON.stringify(state.map.candidates)).toBe(JSON.stringify(generated.candidates));
    expect(state.map.candidates).toHaveLength(6);
    let rngState = seedToRngState('idleswarm');
    for (let i = 0; i < 30; i++) {
      rngState = nextRandom(rngState).rngState;
    }
    expect(state.rngState).toBe(rngState);
  });

  it('beginnt auf Wunsch mit einem übergebenen RNG-Zustand', () => {
    const custom = createInitialState({ seed: 'idleswarm', now: NOW, rngState: 3 }, BALANCE_V1);
    const generated = generateCandidates(
      { origin: { x: 0, y: 0 }, moves: 0, range: 5, rngState: 3 },
      BALANCE_V1,
    );
    expect(custom.seed).toBe('idleswarm');
    expect(custom.rngState).toBe(generated.rngState);
    expect(JSON.stringify(custom.map.candidates)).toBe(JSON.stringify(generated.candidates));
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
    expect(state.map.position).toEqual({ x: 0, y: 0 });
    expect(state.map.route).toEqual([{ type: 'vent', position: { x: 0, y: 0 } }]);
    expect(state.map.moves).toBe(0);
    expect(state.travel).toBeNull();
    expect(state.auto).toEqual({ enabled: false, strategy: 'balanced', threshold: 0 });
    expect(state.priority).toBe('balanced');
    expect(state.pheromones).toEqual({ drones: 3, soldiers: 1, glands: 0 });
    expect(state.genome).toEqual({ owned: [] });
    // FNV-1a von „idleswarm#finds“, getrennt vom RNG-Zustand des Generators.
    expect(state.finds).toEqual({ rngState: 3125258866, total: 0, collected: {}, buffs: [] });
  });

  it('leitet den Fund-RNG auch bei übergebenem RNG-Zustand aus dem Seed ab', () => {
    const custom = createInitialState({ seed: 'idleswarm', now: NOW, rngState: 3 }, BALANCE_V1);
    expect(custom.finds.rngState).toBe(state.finds.rngState);
  });

  it('übernimmt überschriebene Parameter', () => {
    const custom = createInitialState(
      { seed: 'idleswarm', now: NOW },
      {
        ...BALANCE_V1,
        startFood: 7,
        startQueens: 2,
        siteSize: 500,
        candidateCount: 3,
        defaultAutoThreshold: 0.95,
        startPheromoneDrones: 2,
        startPheromoneSoldiers: 5,
      },
    );
    expect(custom.res.food.eq(7)).toBe(true);
    expect(custom.units.queens.eq(2)).toBe(true);
    expect(custom.site.size.eq(500)).toBe(true);
    expect(custom.site.stock.eq(500)).toBe(true);
    expect(custom.map.candidates).toHaveLength(3);
    // Die Standard-Schwelle wird auf θ_max begrenzt.
    expect(custom.auto.threshold).toBe(0.9);
    expect(custom.pheromones).toEqual({ drones: 2, soldiers: 5, glands: 0 });
  });

  it('enthält nur die Felder von Version 5', () => {
    expect(Object.keys(state).sort()).toEqual(
      [
        'auto',
        'bought',
        'era',
        'finds',
        'genome',
        'map',
        'onboarding',
        'pheromones',
        'priority',
        'res',
        'rngState',
        'seed',
        'settings',
        'site',
        'time',
        'travel',
        'units',
        'version',
      ].sort(),
    );
    expect(Object.keys(state.map).sort()).toEqual(['candidates', 'moves', 'position', 'route']);
    expect(Object.keys(state.map.candidates[0]).sort()).toEqual([
      'defense',
      'position',
      'size',
      'type',
    ]);
    expect(Object.keys(state.auto).sort()).toEqual(['enabled', 'strategy', 'threshold']);
    expect(Object.keys(state.res).sort()).toEqual(['dna', 'food']);
    expect(Object.keys(state.units).sort()).toEqual(['drones', 'queens', 'soldiers']);
    expect(Object.keys(state.site).sort()).toEqual(['size', 'stock', 'type']);
    expect(Object.keys(state.bought).sort()).toEqual(['drones', 'queens', 'soldiers']);
    expect(Object.keys(state.pheromones).sort()).toEqual(['drones', 'glands', 'soldiers']);
    expect(Object.keys(state.genome)).toEqual(['owned']);
    expect(Object.keys(state.finds).sort()).toEqual(['buffs', 'collected', 'rngState', 'total']);
    expect(Object.keys(state.settings).sort()).toEqual([
      'autosaveIntervalMs',
      'motion',
      'numberFormat',
    ]);
    expect(Object.keys(state.onboarding).sort()).toEqual(['seenHints', 'unlocked']);
  });

  it('teilt keine veränderlichen Teilobjekte zwischen zwei Zuständen', () => {
    const other = createInitialState({ seed: 'idleswarm', now: NOW }, BALANCE_V1);
    expect(other).not.toBe(state);
    expect(other.time).not.toBe(state.time);
    expect(other.res).not.toBe(state.res);
    expect(other.units).not.toBe(state.units);
    expect(other.site).not.toBe(state.site);
    expect(other.bought).not.toBe(state.bought);
    expect(other.map).not.toBe(state.map);
    expect(other.map.position).not.toBe(state.map.position);
    expect(other.auto).not.toBe(state.auto);
    expect(other.pheromones).not.toBe(state.pheromones);
    expect(other.genome).not.toBe(state.genome);
    expect(other.finds).not.toBe(state.finds);
    // Einstellungen und Onboarding sind eingefrorene Standardwerte, geteilt ist also unbedenklich.
    expect(Object.isFrozen(state.settings)).toBe(true);
    expect(Object.isFrozen(state.onboarding.unlocked)).toBe(true);
  });

  it('beginnt mit Standard-Einstellungen und ohne Freischaltungen', () => {
    expect(state.settings).toEqual({
      numberFormat: 'short',
      motion: 'system',
      autosaveIntervalMs: 30_000,
    });
    expect(state.onboarding).toEqual({ unlocked: [], seenHints: [] });
  });

  it('schaltet mit überschriebenen Startwerten frei, was schon erreicht ist', () => {
    const rich = createInitialState(
      { seed: 'idleswarm', now: NOW },
      { ...BALANCE_V1, startFood: 100 },
    );
    expect(rich.onboarding.unlocked).toEqual(['pheromones']);
  });

  it('serialisiert Mengen über Num.toJSON', () => {
    expect(JSON.parse(JSON.stringify(state))).toEqual({
      version: 5,
      seed: 'idleswarm',
      rngState: 491280603,
      time: { now: NOW, lastSaved: NOW, played: 0 },
      era: 'ursuppe',
      res: { food: '1.5e1', dna: '0e0' },
      units: { queens: '1e0', drones: '0e0', soldiers: '0e0' },
      site: { type: 'vent', size: '2e4', stock: '2e4' },
      bought: { queens: '0e0', drones: '0e0', soldiers: '0e0' },
      map: {
        position: { x: 0, y: 0 },
        candidates: expect.any(Array),
        route: [{ type: 'vent', position: { x: 0, y: 0 } }],
        moves: 0,
      },
      travel: null,
      auto: { enabled: false, strategy: 'balanced', threshold: 0 },
      priority: 'balanced',
      pheromones: { drones: 3, soldiers: 1, glands: 0 },
      genome: { owned: [] },
      finds: { rngState: 3125258866, total: 0, collected: {}, buffs: [] },
      settings: { numberFormat: 'short', motion: 'system', autosaveIntervalMs: 30000 },
      onboarding: { unlocked: [], seenHints: [] },
    });
    expect(JSON.parse(JSON.stringify(state.map.candidates[0]))).toEqual({
      type: 'algal-mat',
      position: { x: expect.any(Number), y: expect.any(Number) },
      size: expect.stringMatching(/^1\.79670415\d*e4$/),
      defense: '0e0',
    });
  });
});
