import { nextRandom, seedToRngState } from './rng';

function sequence(rngState: number, length: number): number[] {
  const values: number[] = [];
  let current = rngState;
  for (let i = 0; i < length; i++) {
    const result = nextRandom(current);
    values.push(result.value);
    current = result.rngState;
  }
  return values;
}

describe('seedToRngState', () => {
  // Eingefroren: Spielstände hängen von diesen Werten ab.
  it.each([
    ['', 2166136261],
    ['a', 3826002220],
    ['foobar', 3214735720],
    ['idleswarm', 1378881061],
    ['Ursuppe-ä🐜', 4226750977],
  ])('bildet %j stabil ab', (seed, expected) => {
    expect(seedToRngState(seed)).toBe(expected);
  });

  it('liefert uint32 und trennt ähnliche Seeds', () => {
    const states = ['seed-1', 'seed-2', 'seed-3', '1-dees'].map(seedToRngState);
    for (const state of states) {
      expect(Number.isInteger(state)).toBe(true);
      expect(state).toBeGreaterThanOrEqual(0);
      expect(state).toBeLessThanOrEqual(0xffffffff);
    }
    expect(new Set(states).size).toBe(states.length);
  });
});

describe('nextRandom', () => {
  // Eingefroren: Eine Änderung dieser Folge würde bestehende Spielstände verändern.
  it('liefert für den Seed "idleswarm" die festgelegte Folge', () => {
    let rngState = seedToRngState('idleswarm');
    const results = [];
    for (let i = 0; i < 6; i++) {
      const result = nextRandom(rngState);
      results.push(result);
      rngState = result.rngState;
    }
    expect(results).toEqual([
      { value: 0.1848736652173102, rngState: 3210446874 },
      { value: 0.6685876271221787, rngState: 747045391 },
      { value: 0.28804557863622904, rngState: 2578611204 },
      { value: 0.7356117519084364, rngState: 115209721 },
      { value: 0.8356431915890425, rngState: 1946775534 },
      { value: 0.6760012672748417, rngState: 3778341347 },
    ]);
  });

  it('entspricht Mulberry32 für den Zustand 0', () => {
    expect(sequence(0, 3)).toEqual([
      0.26642920868471265, 0.0003297457005828619, 0.2232720274478197,
    ]);
  });

  it('ist für denselben Zustand reproduzierbar', () => {
    expect(nextRandom(12345)).toEqual(nextRandom(12345));
  });

  it('läuft am Ende des uint32-Bereichs korrekt über', () => {
    const { rngState } = nextRandom(0xffffffff);
    expect(rngState).toBe(0x6d2b79f4);
  });

  it('bleibt in [0, 1) und hält den Zustand als uint32', () => {
    let rngState = seedToRngState('bereich');
    for (let i = 0; i < 10_000; i++) {
      const result = nextRandom(rngState);
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThan(1);
      expect(result.rngState).toBe(result.rngState >>> 0);
      rngState = result.rngState;
    }
  });

  it('liefert für unterschiedliche Seeds unterschiedliche Folgen', () => {
    expect(sequence(seedToRngState('a'), 5)).not.toEqual(sequence(seedToRngState('b'), 5));
  });
});
