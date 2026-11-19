import type { UnlockEffect, ValueEffect } from '@app/balance/domain/models/effect.model';
import type { FragmentId } from '@app/finds/domain/models/finds.model';

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

/**
 * Stabile IDs der einzigartigen Adaptionen der Ära I (Game-Design §4.14). Sie werden nicht
 * gespeichert, sondern aus den Fragmentzählern abgeleitet (§5.1).
 */
export const UNIQUE_ADAPTATION_IDS = [
  'thermosynthesis',
  'algal-symbiosis',
  'crystal-sense',
  'sulfur-shell',
] as const;

export type UniqueAdaptationId = (typeof UNIQUE_ADAPTATION_IDS)[number];

/** Äste des Genoms (Game-Design §4.14). */
export const GENOME_BRANCHES = ['collect', 'brood', 'combat'] as const;

export type GenomeBranch = (typeof GENOME_BRANCHES)[number];

/** Stufen eines Asts; die Stufe bestimmt die DNA-Kosten (Game-Design §4.14). */
export const GENOME_TIERS = [1, 2, 3, 4, 5] as const;

export type GenomeTier = (typeof GENOME_TIERS)[number];

/**
 * Abgeleiteter Status eines Knotens für die Oberfläche (Game-Design §4.14, US-05.02): regulär
 * `evolved`, `available`, `too-expensive` oder `locked`; einzigartig `evolved` oder `undiscovered`.
 */
export const GENOME_NODE_STATUSES = [
  'evolved',
  'available',
  'too-expensive',
  'locked',
  'undiscovered',
] as const;

export type GenomeNodeStatus = (typeof GENOME_NODE_STATUSES)[number];

export type RegularNodeStatus = Exclude<GenomeNodeStatus, 'undiscovered'>;

export type UniqueAdaptationStatus = Extract<GenomeNodeStatus, 'evolved' | 'undiscovered'>;

/**
 * Effekt der Spieldaten ohne Zahl: Ziel, Operation und ggf. Bedingung. Den Betrag bzw. Faktor eines
 * Effekts mit Zahl liefert `params` über `GENOME_NODE_PARAMS` bzw. `UNIQUE_ADAPTATION_PARAMS`
 * (Game-Design §2.3, Parameter je ID).
 */
export type EffectSpec = Omit<ValueEffect, 'value'> | UnlockEffect;

/** Regulärer Knoten (Game-Design §4.14); höchstens ein Effekt mit Zahl (`<id>Effect`). */
export interface GenomeNode {
  readonly id: GenomeNodeId;
  readonly branch: GenomeBranch;
  readonly tier: GenomeTier;
  readonly predecessor: GenomeNodeId | GenomeRoot;
  readonly effects: readonly EffectSpec[];
}

/**
 * Einzigartige Adaption (Game-Design §4.14): wirkt, sobald alle Fragmente gefunden sind. Der Anker
 * legt nur fest, wo sie im Baum hängt, und ist keine Voraussetzung.
 */
export interface UniqueAdaptation {
  readonly id: UniqueAdaptationId;
  readonly anchor: GenomeNodeId;
  readonly fragment: FragmentId;
  readonly effects: readonly EffectSpec[];
}

/** Fragmentfortschritt einer einzigartigen Adaption: `found / required` (US-06.02). */
export interface FragmentProgress {
  /** Gefundene Fragmente, höchstens `required`. */
  readonly found: number;
  readonly required: number;
}

/** Gespeicherter Zustand des Genoms (Game-Design §5.1). */
export interface Genome {
  /** Entwickelte reguläre Adaptionen in der Reihenfolge der Spieldaten, ohne `root`. */
  readonly owned: readonly GenomeNodeId[];
}

export function isGenomeNodeId(value: unknown): value is GenomeNodeId {
  return (GENOME_NODE_IDS as readonly unknown[]).includes(value);
}
