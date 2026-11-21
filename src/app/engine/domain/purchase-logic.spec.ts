import { BalanceParams, DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { Num } from '@app/shared/util/num/num';

import { createInitialState } from './game-state-logic';
import { isAnyPurchaseAffordable } from './purchase-logic';

/** Startet ohne Nahrung; Einheiten zu 40, Drüsenpunkt zu 50, Genom wie im Standard. */
const PARAMS: BalanceParams = {
  ...DEFAULT_BALANCE,
  startFood: 0,
  droneCost: 40,
  soldierCost: 40,
  queenCost: 40,
  glandCost: 50,
};

function stateWith(food: number, dna = 0, params = PARAMS) {
  const state = createInitialState({ seed: 'purchase', now: 0 }, params);
  return { ...state, res: { ...state.res, food: Num.from(food), dna: Num.from(dna) } };
}

describe('isAnyPurchaseAffordable', () => {
  it('ist ohne Nahrung und DNA falsch', () => {
    expect(isAnyPurchaseAffordable(stateWith(0), PARAMS)).toBe(false);
  });

  it('erkennt eine bezahlbare Einheit, auch mit übergebenen Preisen', () => {
    expect(isAnyPurchaseAffordable(stateWith(40), PARAMS)).toBe(true);
    const cheap = { queens: Num.from(1), drones: Num.from(1), soldiers: Num.from(1) };
    expect(isAnyPurchaseAffordable(stateWith(1), PARAMS, cheap)).toBe(true);
  });

  it('erkennt einen bezahlbaren Drüsenpunkt', () => {
    const params = { ...PARAMS, glandCost: 20 };
    expect(isAnyPurchaseAffordable(stateWith(20, 0, params), params)).toBe(true);
  });

  it('erkennt eine bezahlbare Adaption', () => {
    const cost = DEFAULT_BALANCE.genomeCost;
    expect(isAnyPurchaseAffordable(stateWith(0, cost - 1), PARAMS)).toBe(false);
    expect(isAnyPurchaseAffordable(stateWith(0, cost), PARAMS)).toBe(true);
  });
});
