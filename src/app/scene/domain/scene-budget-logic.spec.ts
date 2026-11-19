import { Num } from '@app/shared/util/num/num';

import {
  SPRITE_BUDGET,
  SPRITE_BUDGET_MOBILE,
  spriteBudget,
  spriteCounts,
  unitCounts,
} from './scene-budget-logic';

const sum = (counts: { queens: number; drones: number; soldiers: number }): number =>
  counts.queens + counts.drones + counts.soldiers;

describe('spriteBudget', () => {
  it('gibt am Desktop 300 und mobil 150 Sprites', () => {
    expect(spriteBudget(1280, false)).toBe(SPRITE_BUDGET);
    expect(spriteBudget(767, false)).toBe(SPRITE_BUDGET_MOBILE);
    expect(spriteBudget(768, false)).toBe(SPRITE_BUDGET);
    expect(spriteBudget(1280, true)).toBe(SPRITE_BUDGET_MOBILE);
  });
});

describe('unitCounts', () => {
  it('rundet ab und kappt riesige Bestände', () => {
    expect(
      unitCounts({ queens: Num.from(2.7), drones: Num.from('1e400'), soldiers: Num.ZERO }),
    ).toEqual({ queens: 2, drones: Number.MAX_SAFE_INTEGER, soldiers: 0 });
  });
});

describe('spriteCounts', () => {
  it('zeichnet bis zum Budget jede Einheit', () => {
    const counts = { queens: 1, drones: 120, soldiers: 30 };
    expect(spriteCounts(counts, 300)).toEqual(counts);
  });

  it('teilt darüber proportional und füllt das Budget genau', () => {
    const result = spriteCounts({ queens: 100, drones: 2000, soldiers: 900 }, 300);
    expect(result).toEqual({ queens: 10, drones: 200, soldiers: 90 });
  });

  it('verteilt Reste nach dem größten Nachkommaanteil', () => {
    const result = spriteCounts({ queens: 1, drones: 1, soldiers: 1 }, 2);
    expect(sum(result)).toBe(2);
    const uneven = spriteCounts({ queens: 50, drones: 175, soldiers: 175 }, 300);
    // Quoten 37,5 / 131,25 / 131,25 → die Königinnen bekommen den Rest.
    expect(uneven).toEqual({ queens: 38, drones: 131, soldiers: 131 });
  });

  it('gibt jedem vorhandenen Typ mindestens ein Sprite', () => {
    const result = spriteCounts({ queens: 1, drones: 1_000_000, soldiers: 2 }, 150);
    expect(result.queens).toBe(1);
    expect(result.soldiers).toBe(1);
    expect(result.drones).toBe(148);
  });

  it('lässt fehlende Typen bei 0', () => {
    expect(spriteCounts({ queens: 0, drones: 5000, soldiers: 0 }, 300)).toEqual({
      queens: 0,
      drones: 300,
      soldiers: 0,
    });
  });
});
