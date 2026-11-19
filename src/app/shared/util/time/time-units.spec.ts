import { MS_PER_HOUR, MS_PER_MINUTE, MS_PER_SECOND } from './time-units';

describe('time units', () => {
  it('has the milliseconds of a second, minute and hour', () => {
    expect(MS_PER_SECOND).toBe(1000);
    expect(MS_PER_MINUTE).toBe(60_000);
    expect(MS_PER_HOUR).toBe(3_600_000);
  });
});
