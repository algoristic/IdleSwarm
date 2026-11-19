import type { GenomeNodeId, GenomeRoot } from '../models/genome.model';

/**
 * Vorgänger je regulärem Knoten (Game-Design §4.14): Die Äste sind lineare Ketten, die erste Stufe
 * hängt an der Wurzel. Reine Struktur ohne Balance-Werte; die Ladeprüfung nutzt sie (§5.1).
 */
export const GENOME_NODE_PREDECESSORS: Readonly<Record<GenomeNodeId, GenomeNodeId | GenomeRoot>> =
  Object.freeze({
    'cilia-1': 'root',
    'cilia-2': 'cilia-1',
    'filter-feeder': 'cilia-2',
    chemotaxis: 'filter-feeder',
    flagellum: 'chemotaxis',
    'yolk-reserve': 'root',
    'brood-combs': 'yolk-reserve',
    'second-gland': 'brood-combs',
    'nurse-cells': 'second-gland',
    budding: 'nurse-cells',
    'acid-vacuole': 'root',
    autophagy: 'acid-vacuole',
    'nettle-cells': 'autophagy',
    'chalk-shell': 'nettle-cells',
    'spine-cells': 'chalk-shell',
  });
