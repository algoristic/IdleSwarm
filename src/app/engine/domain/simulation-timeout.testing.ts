import { MS_PER_SECOND } from '@app/shared/util/time/time-units';

/**
 * Timeout für Specs, die Stunden Spielzeit simulieren (Nachholen, Tick-für-Tick-Vergleiche). Lokal
 * brauchen sie wenige Sekunden; auf dem CI-Runner mit wenigen Kernen und Coverage-Instrumentierung
 * reißen sie die 5 s von Vitest.
 */
export const SIMULATION_TEST_TIMEOUT_MS = 30 * MS_PER_SECOND;
