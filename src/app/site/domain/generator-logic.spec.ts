import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { distanceBetween } from '@app/balance/domain/formulas';
import { nextRandom } from '@app/shared/util/rng/rng';

import { generateCandidates, GeneratorInput } from './generator-logic';
import { candidateInfos } from './map-logic';
import type { SiteCandidate } from './models/map.model';

const ORIGIN = { x: 0, y: 0 };

function start(rngState: number): GeneratorInput {
  return { origin: ORIGIN, moves: 0, range: 5, rngState };
}

function advance(rngState: number, draws: number): number {
  let state = rngState;
  for (let i = 0; i < draws; i++) {
    state = nextRandom(state).rngState;
  }
  return state;
}

function isSafeInRange(candidate: SiteCandidate, input: GeneratorInput): boolean {
  return (
    candidate.type === 'algal-mat' &&
    candidate.defense.isZero() &&
    distanceBetween(input.origin, candidate.position) <= input.range + 1e-6
  );
}

/**
 * Erwartete Werte aus einer unabhängigen Nachrechnung von Game-Design §4.6 (Mulberry32, fünf
 * Ziehungen je Kandidat, Formeln für `G` und `B`), nicht aus diesem Code.
 */
describe('generateCandidates', () => {
  it('erzeugt aus dem Seed „idleswarm“ die nachgerechneten Startkandidaten', () => {
    const { candidates, rngState } = generateCandidates(start(1378881061), DEFAULT_BALANCE);
    const expected: readonly [string, number, number, number, number][] = [
      ['algal-mat', -1.3355202136, -2.3790464258, 17967.0415339, 0],
      ['methane-seep', -3.293633596, -4.6881014894, 110733.0565132, 56],
      ['whale-fall', 0.7162878262, 1.0509646791, 71918.6709889, 60],
      ['bacterial-mat', 0.802002866, 2.6904133133, 45218.1078066, 62],
      ['bacterial-mat', -2.848285382, -1.0363895377, 59436.6171955, 55],
      ['whale-fall', 2.0047336413, 0.6885980701, 87211.8422619, 60],
    ];
    expect(candidates).toHaveLength(6);
    candidates.forEach((candidate, i) => {
      const [type, x, y, size, defense] = expected[i];
      expect(candidate.type).toBe(type);
      expect(candidate.position.x).toBeCloseTo(x, 8);
      expect(candidate.position.y).toBeCloseTo(y, 8);
      expect(candidate.size.toNumber()).toBeCloseTo(size, 4);
      expect(candidate.defense.toNumber()).toBe(defense);
    });
    expect(rngState).toBe(491280603);
  });

  it('verbraucht immer 5 · k Zufallszahlen', () => {
    for (const rngState of [3, 260, 1378881061]) {
      expect(generateCandidates(start(rngState), DEFAULT_BALANCE).rngState).toBe(
        advance(rngState, 30),
      );
    }
    const params = { ...DEFAULT_BALANCE, candidateCount: 2 };
    const result = generateCandidates(start(7), params);
    expect(result.candidates).toHaveLength(2);
    expect(result.rngState).toBe(advance(7, 10));
  });

  it('ist deterministisch und verändert die Eingabe nicht', () => {
    const input = Object.freeze({ ...start(42), origin: Object.freeze({ x: 3, y: -2 }) });
    const first = generateCandidates(input, DEFAULT_BALANCE);
    const second = generateCandidates(input, DEFAULT_BALANCE);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(input).toEqual({ origin: { x: 3, y: -2 }, moves: 0, range: 5, rngState: 42 });
    expect(JSON.stringify(generateCandidates(start(43), DEFAULT_BALANCE))).not.toBe(
      JSON.stringify(first),
    );
  });

  it('ersetzt ohne Algenmatte in Reichweite den nächstgelegenen Kandidaten in Reichweite', () => {
    // Gezogen: Methanquelle, Bakterienrasen (d ≈ 1,97, nächster), Algenmatte bei d ≈ 5,28 (außer
    // Reichweite), Walsturz, Bakterienrasen, Schlot.
    const { candidates } = generateCandidates(start(3), DEFAULT_BALANCE);
    expect(candidates.map(({ type }) => type)).toEqual([
      'methane-seep',
      'algal-mat',
      'algal-mat',
      'whale-fall',
      'bacterial-mat',
      'vent',
    ]);
    const replaced = candidates[1];
    expect(distanceBetween(ORIGIN, replaced.position)).toBeCloseTo(1.9708033996, 8);
    expect(replaced.size.toNumber()).toBeCloseTo(13904.6541552, 4);
    expect(replaced.defense.isZero()).toBe(true);
    expect(distanceBetween(ORIGIN, candidates[2].position)).toBeGreaterThan(5);
  });

  it('setzt ohne Kandidaten in Reichweite den nächstgelegenen auf die Distanz R', () => {
    // Gezogen: alle sechs Kandidaten außer Reichweite, der erste ist der nächste.
    const { candidates } = generateCandidates(start(260), DEFAULT_BALANCE);
    const replaced = candidates[0];
    expect(replaced.type).toBe('algal-mat');
    expect(replaced.position.x).toBeCloseTo(-3.342274791, 8);
    expect(replaced.position.y).toBeCloseTo(-3.7187631305, 8);
    expect(distanceBetween(ORIGIN, replaced.position)).toBeCloseTo(5, 10);
    expect(replaced.size.toNumber()).toBeCloseTo(20315.1260145, 4);
    expect(replaced.defense.isZero()).toBe(true);
    expect(candidates[1].type).toBe('methane-seep');
    const statuses = candidateInfos(candidates, ORIGIN, 5, DEFAULT_BALANCE).map((i) => i.status);
    expect(statuses[0]).toBe('in-range');
    expect(statuses.filter((status) => status === 'in-range')).toHaveLength(1);
  });

  it('garantiert über viele RNG-Zustände Anzahl, Distanzbereich und eine sichere Futterstelle', () => {
    const inputs: GeneratorInput[] = [];
    for (let i = 0; i < 2000; i++) {
      const rngState = advance(i * 7919, 1);
      inputs.push(start(rngState));
      inputs.push({ origin: { x: 12.5, y: -40 }, moves: 7, range: 5, rngState });
    }
    for (const input of inputs) {
      const { candidates } = generateCandidates(input, DEFAULT_BALANCE);
      expect(candidates).toHaveLength(6);
      for (const candidate of candidates) {
        const distance = distanceBetween(input.origin, candidate.position);
        expect(distance).toBeGreaterThanOrEqual(1 - 1e-9);
        expect(distance).toBeLessThan(7);
        expect(candidate.size.gt(0)).toBe(true);
        expect(candidate.defense.round().eq(candidate.defense)).toBe(true);
      }
      expect(candidates.some((candidate) => isSafeInRange(candidate, input))).toBe(true);
      const statuses = candidateInfos(candidates, input.origin, input.range, DEFAULT_BALANCE);
      expect(
        statuses.some(({ status }, i) => status === 'in-range' && candidates[i].defense.isZero()),
      ).toBe(true);
    }
  });

  it('wächst mit dem Zugzähler z', () => {
    const atStart = generateCandidates(start(99), DEFAULT_BALANCE).candidates;
    const later = generateCandidates({ ...start(99), moves: 1 }, DEFAULT_BALANCE).candidates;
    atStart.forEach((candidate, i) => {
      expect(later[i].size.div(candidate.size).toNumber()).toBeCloseTo(1.4, 10);
    });
  });

  it('nutzt die überschriebenen Parameter', () => {
    const params = {
      ...DEFAULT_BALANCE,
      candidateMinDistance: 2,
      candidateMaxDistance: 2,
      algalMatWeight: 0,
      ventWeight: 0,
      bacterialMatWeight: 0,
      methaneSeepWeight: 0,
    };
    const { candidates } = generateCandidates(start(5), params);
    // Nur Walstürze werden gezogen; die Garantie macht den ersten (alle gleich nah) zur Algenmatte.
    expect(candidates.map(({ type }) => type)).toEqual([
      'algal-mat',
      'whale-fall',
      'whale-fall',
      'whale-fall',
      'whale-fall',
      'whale-fall',
    ]);
    for (const candidate of candidates) {
      expect(distanceBetween(ORIGIN, candidate.position)).toBeCloseTo(2, 10);
    }
  });

  it('erzeugt ohne Kandidaten eine leere Liste', () => {
    const result = generateCandidates(start(5), { ...DEFAULT_BALANCE, candidateCount: 0 });
    expect(result).toEqual({ candidates: [], rngState: 5 });
  });
});
