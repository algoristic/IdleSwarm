/**
 * Liest in Specs, ob dieser Lauf Coverage erhebt; Leistungstests überspringen sich dann, weil die
 * Instrumentierung die Laufzeit vervielfacht. `ng test --coverage` gibt das nur in der
 * Worker-Konfiguration von Vitest weiter; ändert sich deren Form, schlägt die Spec fehl, statt Tests
 * still zu überspringen.
 */
export function isCoverageRun(): boolean {
  const { __vitest_worker__: worker } = globalThis as unknown as {
    __vitest_worker__?: { config?: { coverage?: { enabled?: unknown } } };
  };
  const enabled = worker?.config?.coverage?.enabled;
  if (typeof enabled !== 'boolean') {
    throw new Error('Vitest-Konfiguration ohne coverage.enabled');
  }
  return enabled;
}
