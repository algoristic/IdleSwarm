import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import { GameState } from '@app/engine/domain/models/game-state.model';
import { Num } from '@app/shared/util/num/num';

import { SiteTypeId } from './data/sites-era1.data';
import { STRATEGY_IDS, StrategyId } from './models/auto-move.model';
import { SiteCandidate } from './models/map.model';
import { strategyTarget } from './strategy-logic';

function candidate(
  type: SiteTypeId,
  x: number,
  y: number,
  size: number,
  defense: number,
): SiteCandidate {
  return { type, position: { x, y }, size: Num.from(size), defense: Num.from(defense) };
}

/** Kandidaten aus Game-Design §4.6, Beispiel 3, mit den Distanzen der Tabelle um `(0, 0)`. */
const EXAMPLE_3: readonly SiteCandidate[] = [
  candidate('vent', 3, 0, 30_240, 26),
  candidate('bacterial-mat', 0, 3, 55_440, 52),
  candidate('algal-mat', -2, 0, 16_940, 0),
  candidate('vent', 0, -1, 28_000, 20),
  candidate('whale-fall', 5.8, 0, 124_320, 103),
  candidate('methane-seep', 0, 6.5, 108_500, 73),
];

const initial = createInitialState({ seed: 'strategie', now: 0 });

/** `S = S' = 34` mit genug Platz (`Q = 7`, `C = 70 ≥ 68`) wie in Beispiel 8. */
function stateWith(candidates: readonly SiteCandidate[], soldiers = 34): GameState {
  return Object.freeze({
    ...initial,
    units: { queens: Num.from(7), drones: Num.ZERO, soldiers: Num.from(soldiers) },
    map: { ...initial.map, candidates },
  });
}

function pick(state: GameState, strategy: StrategyId, params = DEFAULT_BALANCE): number | null {
  return strategyTarget(state, strategy, params);
}

describe('strategyTarget (Game-Design §4.12)', () => {
  describe('Beispiel 8', () => {
    const state = stateWith(EXAMPLE_3);

    it('„Geringster Widerstand“ wählt K3', () => {
      expect(pick(state, 'least-resistance')).toBe(2);
    });

    it('„Ausgewogen“ wählt K4: K1 überschreitet 25 %, K4 ist größer als K3', () => {
      expect(pick(state, 'balanced')).toBe(3);
    });

    it('„Kampfgehärtet“ wählt K1', () => {
      expect(pick(state, 'battle-hardened')).toBe(0);
    });
  });

  it('wählt nur einnehmbare Ziele in Reichweite', () => {
    // Ohne Soldaten bleibt nur die Algenmatte; K5 wäre größer, liegt aber außer Reichweite.
    const state = stateWith(EXAMPLE_3, 0);
    for (const strategy of STRATEGY_IDS) {
      expect(pick(state, strategy)).toBe(2);
    }
  });

  it('nutzt die mitkommenden Soldaten S′ nach Transport', () => {
    // Q = 1: C = 10, also S′ = 5 – nur K3 ist einnehmbar.
    const state = Object.freeze({
      ...stateWith(EXAMPLE_3),
      units: { queens: Num.ONE, drones: Num.ZERO, soldiers: Num.from(34) },
    });
    expect(pick(state, 'battle-hardened')).toBe(2);
  });

  it('liefert null ohne einnehmbares Ziel in Reichweite', () => {
    const state = stateWith([candidate('vent', 1, 0, 1000, 50), candidate('vent', 9, 0, 1000, 0)]);
    for (const strategy of STRATEGY_IDS) {
      expect(pick(state, strategy)).toBeNull();
    }
  });

  describe('Gleichstand', () => {
    it('„Geringster Widerstand“: bei gleichen Verlusten der größere Vorrat', () => {
      const state = stateWith([
        candidate('algal-mat', 1, 0, 1000, 0),
        candidate('algal-mat', 2, 0, 2000, 0),
      ]);
      expect(pick(state, 'least-resistance')).toBe(1);
    });

    it('„Ausgewogen“: bei gleichem Vorrat die geringeren Verluste', () => {
      const state = stateWith([
        candidate('vent', 1, 0, 5000, 10),
        candidate('vent', 2, 0, 5000, 5),
      ]);
      expect(pick(state, 'balanced')).toBe(1);
    });

    it('„Kampfgehärtet“: bei gleicher DNA der größere Vorrat', () => {
      const state = stateWith([
        candidate('vent', 1, 0, 5000, 20),
        candidate('vent', 2, 0, 6000, 20),
      ]);
      expect(pick(state, 'battle-hardened')).toBe(1);
    });

    it('danach die geringere Distanz', () => {
      const state = stateWith([
        candidate('vent', 3, 0, 5000, 20),
        candidate('vent', 0, 2, 5000, 20),
      ]);
      for (const strategy of STRATEGY_IDS) {
        expect(pick(state, strategy)).toBe(1);
      }
    });

    it('zuletzt der kleinere Index', () => {
      const state = stateWith([
        candidate('vent', 4, 0, 5000, 20),
        candidate('vent', 0, 2, 5000, 20),
        candidate('vent', 2, 0, 5000, 20),
      ]);
      for (const strategy of STRATEGY_IDS) {
        expect(pick(state, strategy)).toBe(1);
      }
    });
  });

  describe('Rückfall auf die sichere Futterstelle', () => {
    const params = { ...DEFAULT_BALANCE, balancedMaxLossShare: -1 };

    it('wählt die Futterstelle ohne Abwehr mit dem größeren Vorrat', () => {
      const state = stateWith([
        candidate('algal-mat', 1, 0, 1000, 0),
        candidate('vent', 1, 1, 9000, 10),
        candidate('algal-mat', 2, 0, 1500, 0),
      ]);
      expect(pick(state, 'balanced', params)).toBe(2);
    });

    it('entscheidet dann nach Distanz und Index', () => {
      const state = stateWith([
        candidate('algal-mat', 2, 0, 1000, 0),
        candidate('algal-mat', 0, 1, 1000, 0),
        candidate('algal-mat', -1, 0, 1000, 0),
      ]);
      expect(pick(state, 'balanced', params)).toBe(1);
    });

    it('liefert null ohne sichere Futterstelle in Reichweite', () => {
      const state = stateWith([candidate('vent', 1, 0, 9000, 10)]);
      expect(pick(state, 'balanced', params)).toBeNull();
    });
  });
});
