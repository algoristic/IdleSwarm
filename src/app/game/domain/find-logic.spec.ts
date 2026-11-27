import { activeBuffs } from './find-logic';

describe('activeBuffs', () => {
  it('lists the buffs with remaining time in the order of the buff list', () => {
    const buffs = { tailwind: 0.25, breedingFrenzy: 0, layingBoost: 5, feedingFrenzy: 0 };
    expect(activeBuffs({ buffs })).toEqual(['layingBoost', 'tailwind']);
  });

  it('is empty without remaining time', () => {
    const buffs = { feedingFrenzy: 0, layingBoost: 0, breedingFrenzy: 0, tailwind: 0 };
    expect(activeBuffs({ buffs })).toEqual([]);
  });
});
