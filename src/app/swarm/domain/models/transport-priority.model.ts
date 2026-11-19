/** Stabile IDs der Mitnahme-Prioritäten (Game-Design §4.9); Spielstände speichern sie. */
export const TRANSPORT_PRIORITIES = ['drones-first', 'soldiers-first', 'balanced'] as const;

export type TransportPriority = (typeof TRANSPORT_PRIORITIES)[number];

/** Priorität in einem neuen Spiel (Game-Design §2.1). */
export const DEFAULT_TRANSPORT_PRIORITY: TransportPriority = 'balanced';

export function isTransportPriority(value: unknown): value is TransportPriority {
  return (TRANSPORT_PRIORITIES as readonly unknown[]).includes(value);
}
