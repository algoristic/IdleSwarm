import {
  DEFAULT_TRANSPORT_PRIORITY,
  isTransportPriority,
  TRANSPORT_PRIORITIES,
} from './transport-priority.model';

describe('Mitnahme-Prioritäten', () => {
  it('hält die stabilen IDs fest', () => {
    expect(TRANSPORT_PRIORITIES).toEqual(['drones-first', 'soldiers-first', 'balanced']);
    expect(DEFAULT_TRANSPORT_PRIORITY).toBe('balanced');
  });

  it('erkennt nur bekannte IDs', () => {
    expect(isTransportPriority('soldiers-first')).toBe(true);
    expect(isTransportPriority('queens-first')).toBe(false);
    expect(isTransportPriority(1)).toBe(false);
  });
});
