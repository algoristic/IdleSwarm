/**
 * Stabile IDs der regulären Knoten der Ära I in der Reihenfolge der Spieldaten (Game-Design §4.14);
 * Spielstände speichern sie, also nicht umbenennen. Die Wurzel `root` gehört nicht dazu.
 */
export const GENOME_NODE_IDS = [
  'cilia-1',
  'cilia-2',
  'filter-feeder',
  'chemotaxis',
  'flagellum',
  'yolk-reserve',
  'brood-combs',
  'second-gland',
  'nurse-cells',
  'budding',
  'acid-vacuole',
  'autophagy',
  'nettle-cells',
  'chalk-shell',
  'spine-cells',
] as const;

export type GenomeNodeId = (typeof GENOME_NODE_IDS)[number];

/** Wurzel des Genoms: immer entwickelt, ohne Kosten und Effekt, wird nicht gespeichert. */
export const GENOME_ROOT = 'root';

export type GenomeRoot = typeof GENOME_ROOT;

/** Gespeicherter Zustand des Genoms (Game-Design §5.1). */
export interface Genome {
  /** Entwickelte reguläre Adaptionen in der Reihenfolge der Spieldaten, ohne `root`. */
  readonly owned: readonly GenomeNodeId[];
}

export function isGenomeNodeId(value: unknown): value is GenomeNodeId {
  return (GENOME_NODE_IDS as readonly unknown[]).includes(value);
}
