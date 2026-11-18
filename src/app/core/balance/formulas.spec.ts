import { Num } from '../num/num';
import { DEFAULT_BALANCE } from './constants';
import { clickGain } from './formulas';

describe('clickGain', () => {
  it('liefert den Klickertrag bei ausreichendem Vorrat', () => {
    expect(clickGain(Num.from(20000), DEFAULT_BALANCE).eq(1)).toBe(true);
  });

  it('begrenzt den Ertrag auf den Vorrat', () => {
    expect(clickGain(Num.from(0.25), DEFAULT_BALANCE).eq(0.25)).toBe(true);
    expect(clickGain(Num.ZERO, DEFAULT_BALANCE).isZero()).toBe(true);
  });

  it('nutzt überschriebene Parameter', () => {
    expect(clickGain(Num.from(100), { ...DEFAULT_BALANCE, clickYield: 3 }).eq(3)).toBe(true);
  });
});
