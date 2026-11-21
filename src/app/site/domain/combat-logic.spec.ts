import { BALANCE_V1 } from '@app/balance/domain/balance-v1.testing';
import { NEUTRAL_MODIFIERS } from '@app/balance/domain/effects-logic';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import { GameState } from '@app/engine/domain/models/game-state.model';
import { Num } from '@app/shared/util/num/num';
import { TransportPriority } from '@app/swarm/domain/models/transport-priority.model';

import { applyCapture, assessCombat, assessTarget, assessTargets } from './combat-logic';
import { SiteCandidate } from './models/map.model';

const initial = createInitialState({ seed: 'idleswarm', now: 1000 });

function target(defense: number): SiteCandidate {
  return {
    type: 'vent',
    position: { x: 3, y: 0 },
    size: Num.from(30_240),
    defense: Num.from(defense),
  };
}

function stateWith(
  queens: number,
  drones: number,
  soldiers: number,
  priority: TransportPriority = 'balanced',
): GameState {
  return Object.freeze({
    ...initial,
    units: Object.freeze({
      queens: Num.from(queens),
      drones: Num.from(drones),
      soldiers: Num.from(soldiers),
    }),
    priority,
  });
}

describe('assessCombat (Game-Design §4.8, Beispiel 4)', () => {
  it('beurteilt K1 (B = 26) bei S = 34 als einnehmbar', () => {
    const result = assessCombat(Num.from(34), Num.from(26), BALANCE_V1, NEUTRAL_MODIFIERS);
    expect(result.attack.eq(34)).toBe(true);
    expect(result.capturable).toBe(true);
    expect(result.losses.toNumber()).toBeCloseTo(9.94, 2);
    expect(result.lossShare.toNumber()).toBeCloseTo(0.292, 3);
    expect(result.dna.toNumber()).toBeCloseTo(13.55, 2);
  });

  it('beurteilt K2 (B = 52) als zu stark', () => {
    expect(assessCombat(Num.from(34), Num.from(52), BALANCE_V1, NEUTRAL_MODIFIERS).capturable).toBe(
      false,
    );
  });

  it('nimmt eine Futterstelle ohne Abwehr auch ohne Soldaten ein', () => {
    const result = assessCombat(Num.ZERO, Num.ZERO, BALANCE_V1, NEUTRAL_MODIFIERS);
    expect(result.capturable).toBe(true);
    expect(result.losses.isZero()).toBe(true);
    expect(result.lossShare.isZero()).toBe(true);
    expect(result.dna.isZero()).toBe(true);
  });
});

describe('assessTarget (Game-Design §4.9, Beispiel 5)', () => {
  it('rechnet mit S′ nach Transport bei „ausgewogen“', () => {
    const result = assessTarget(stateWith(20, 500, 130), target(26), BALANCE_V1, NEUTRAL_MODIFIERS);
    expect(result.soldiers.toNumber()).toBeCloseTo(34.21, 2);
    expect(result.capturable).toBe(true);
    expect(result.losses.toNumber()).toBeCloseTo(9.88, 2);
  });

  it('lässt bei „Drohnen zuerst“ nur Ziele ohne Abwehr einnehmbar', () => {
    const state = stateWith(20, 500, 130, 'drones-first');
    expect(assessTarget(state, target(26), BALANCE_V1, NEUTRAL_MODIFIERS).capturable).toBe(false);
    expect(assessTarget(state, target(0), BALANCE_V1, NEUTRAL_MODIFIERS).capturable).toBe(true);
  });

  it('rechnet bei genug Platz mit allen Soldaten', () => {
    const result = assessTarget(stateWith(10, 0, 34), target(20), BALANCE_V1, NEUTRAL_MODIFIERS);
    expect(result.soldiers.eq(34)).toBe(true);
    expect(result.losses.toNumber()).toBeCloseTo(5.88, 2);
  });

  it('bewertet alle Kandidaten in Listenreihenfolge', () => {
    const state = stateWith(10, 0, 34);
    const results = assessTargets(state, BALANCE_V1, NEUTRAL_MODIFIERS);
    expect(results).toHaveLength(state.map.candidates.length);
    state.map.candidates.forEach((candidate, i) => {
      expect(
        results[i].dna.eq(assessTarget(state, candidate, BALANCE_V1, NEUTRAL_MODIFIERS).dna),
      ).toBe(true);
    });
  });
});

describe('applyCapture (Game-Design §4.11, Beispiel 7)', () => {
  it('zieht die Verluste mit den Soldaten bei Ankunft ab und schreibt DNA gut', () => {
    const state = stateWith(1, 0, 34.75);
    const next = applyCapture(state, target(26), BALANCE_V1, NEUTRAL_MODIFIERS);
    expect(next.units.soldiers.toNumber()).toBeCloseTo(34.75 - 9.73, 2);
    expect(next.res.dna.toNumber()).toBeCloseTo(13.55, 2);
    expect(next.res.food).toBe(state.res.food);
    expect(state.units.soldiers.eq(34.75)).toBe(true);
  });

  it('gibt gegen B = 0 denselben Zustand zurück', () => {
    const state = stateWith(1, 0, 5);
    expect(applyCapture(state, target(0), BALANCE_V1, NEUTRAL_MODIFIERS)).toBe(state);
  });
});
