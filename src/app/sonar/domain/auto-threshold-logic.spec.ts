import { DEFAULT_BALANCE } from '@app/balance/domain/constants';

import {
  maxThresholdPercent,
  parseThresholdPercent,
  thresholdFromPercent,
  thresholdToPercent,
} from './auto-threshold-logic';

describe('Schwelle des Auto-Weiterziehens in Prozent', () => {
  it('rechnet zwischen Anteil und ganzen Prozent um', () => {
    expect(thresholdToPercent(0.25)).toBe(25);
    expect(thresholdToPercent(0.125)).toBe(13);
    expect(thresholdFromPercent(25)).toBe(0.25);
  });

  it('nimmt die Obergrenze aus den Parametern', () => {
    expect(maxThresholdPercent(DEFAULT_BALANCE)).toBe(90);
  });

  it('liest nur ganze Prozent von 0 bis zur Obergrenze', () => {
    expect(parseThresholdPercent('0', 90)).toBe(0);
    expect(parseThresholdPercent(' 90 ', 90)).toBe(90);
    expect(parseThresholdPercent('91', 90)).toBeNull();
    expect(parseThresholdPercent('-1', 90)).toBeNull();
    expect(parseThresholdPercent('12,5', 90)).toBeNull();
    expect(parseThresholdPercent('', 90)).toBeNull();
    expect(parseThresholdPercent('abc', 90)).toBeNull();
  });
});
