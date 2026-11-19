import type { GenomeNodeId, UniqueAdaptationId } from '../../domain/models/genome.model';

/** Namen der regulären Adaptionen für Log und Genom-Ansicht (Game-Design §4.14). */
export const GENOME_NODE_LABELS: Readonly<Record<GenomeNodeId, string>> = {
  'cilia-1': $localize`:@@uiGenome-genomeLabels-node-cilia1:Cilien-Schlag I`,
  'cilia-2': $localize`:@@uiGenome-genomeLabels-node-cilia2:Cilien-Schlag II`,
  'filter-feeder': $localize`:@@uiGenome-genomeLabels-node-filterFeeder:Filtrierer`,
  chemotaxis: $localize`:@@uiGenome-genomeLabels-node-chemotaxis:Chemotaxis`,
  flagellum: $localize`:@@uiGenome-genomeLabels-node-flagellum:Geißelschlag`,
  'yolk-reserve': $localize`:@@uiGenome-genomeLabels-node-yolkReserve:Dotterreserve`,
  'brood-combs': $localize`:@@uiGenome-genomeLabels-node-broodCombs:Brutwaben`,
  'second-gland': $localize`:@@uiGenome-genomeLabels-node-secondGland:Zweite Drüse`,
  'nurse-cells': $localize`:@@uiGenome-genomeLabels-node-nurseCells:Ammenzellen`,
  budding: $localize`:@@uiGenome-genomeLabels-node-budding:Knospung`,
  'acid-vacuole': $localize`:@@uiGenome-genomeLabels-node-acidVacuole:Säurevakuole`,
  autophagy: $localize`:@@uiGenome-genomeLabels-node-autophagy:Autophagie`,
  'nettle-cells': $localize`:@@uiGenome-genomeLabels-node-nettleCells:Nesselzellen`,
  'chalk-shell': $localize`:@@uiGenome-genomeLabels-node-chalkShell:Kalkpanzer`,
  'spine-cells': $localize`:@@uiGenome-genomeLabels-node-spineCells:Stachelzellen`,
};

/** Namen der einzigartigen Adaptionen (Game-Design §4.14). */
export const UNIQUE_ADAPTATION_LABELS: Readonly<Record<UniqueAdaptationId, string>> = {
  thermosynthesis: $localize`:@@uiGenome-genomeLabels-unique-thermosynthesis:Thermosynthese`,
  'algal-symbiosis': $localize`:@@uiGenome-genomeLabels-unique-algalSymbiosis:Algensymbiose`,
  'crystal-sense': $localize`:@@uiGenome-genomeLabels-unique-crystalSense:Kristallsinn`,
  'sulfur-shell': $localize`:@@uiGenome-genomeLabels-unique-sulfurShell:Schwefelpanzer`,
};
