import { TICK_MS, TICKS_PER_SECOND } from './constants';

describe('Takt-Konstanten', () => {
  it('legt 10 Ticks pro Sekunde zu je 100 ms fest', () => {
    expect(TICKS_PER_SECOND).toBe(10);
    expect(TICK_MS).toBe(100);
    expect(TICKS_PER_SECOND * TICK_MS).toBe(1000);
  });
});
