import type { EffectTarget } from '@app/balance/domain/models/effect.model';

import {
  GENOME_ROOT,
  GenomeBranch,
  GenomeNodeId,
  GenomeNodeStatus,
  isGenomeNodeId,
  UniqueAdaptationId,
} from '../../domain/models/genome.model';
import type { GenomeEntryId, GenomeTone } from '../models/genome-entry.model';

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

/** Name der Wurzel (Game-Design §4.14). */
export const GENOME_ROOT_LABEL = $localize`:@@uiGenome-genomeLabels-root:Urzelle`;

/** Namen der Äste für Legende und Detailpanel (Game-Design §4.14). */
export const GENOME_BRANCH_LABELS: Readonly<Record<GenomeBranch, string>> = {
  collect: $localize`:@@uiGenome-genomeLabels-branch-collect:Sammeln`,
  brood: $localize`:@@uiGenome-genomeLabels-branch-brood:Brut`,
  combat: $localize`:@@uiGenome-genomeLabels-branch-combat:Kampf`,
};

/** Art der einzigartigen Adaptionen in Legende und Detailpanel (US-06.02). */
export const GENOME_UNIQUE_KIND_LABEL = $localize`:@@uiGenome-genomeLabels-unique-kind:Einzigartig (Fund)`;

/** Knotenstatus für Legende und Vorlesetext (US-05.02). */
export const GENOME_STATUS_LABELS: Readonly<Record<GenomeNodeStatus, string>> = {
  evolved: $localize`:@@uiGenome-genomeLabels-status-evolved:entwickelt`,
  available: $localize`:@@uiGenome-genomeLabels-status-available:verfügbar`,
  'too-expensive': $localize`:@@uiGenome-genomeLabels-status-tooExpensive:zu teuer`,
  locked: $localize`:@@uiGenome-genomeLabels-status-locked:gesperrt`,
  undiscovered: $localize`:@@uiGenome-genomeLabels-status-undiscovered:noch nicht gefunden`,
};

/** Namen der Effektziele für „vorher → nachher“ (Game-Design §4.13, §4.14). */
export const EFFECT_TARGET_LABELS: Readonly<Record<EffectTarget, string>> = {
  collectRate: $localize`:@@uiGenome-genomeLabels-target-collectRate:Sammelleistung je Drohne`,
  broodRate: $localize`:@@uiGenome-genomeLabels-target-broodRate:Eier/min je Königin`,
  findChance: $localize`:@@uiGenome-genomeLabels-target-findChance:Fundchance`,
  combatLoss: $localize`:@@uiGenome-genomeLabels-target-combatLoss:Verluste beim Einnehmen`,
  sacrificeYield: $localize`:@@uiGenome-genomeLabels-target-sacrificeYield:Ausbeute beim Opfern`,
  range: $localize`:@@uiGenome-genomeLabels-target-range:Reichweite`,
  attackPerSoldier: $localize`:@@uiGenome-genomeLabels-target-attackPerSoldier:Angriff je Soldat`,
  spacePerQueen: $localize`:@@uiGenome-genomeLabels-target-spacePerQueen:Platz je Königin`,
  pheromonePoints: $localize`:@@uiGenome-genomeLabels-target-pheromonePoints:Pheromonpunkte`,
  fallenRecycling: $localize`:@@uiGenome-genomeLabels-target-fallenRecycling:Gefallene werden zu Nahrung`,
};

/** Füllfarbe je Ton; vollständige Klassennamen, damit Tailwind sie findet. */
export const GENOME_TONE_FILLS: Readonly<Record<GenomeTone, string>> = {
  collect: 'fill-branch-collect',
  brood: 'fill-branch-brood',
  combat: 'fill-branch-combat',
  unique: 'fill-branch-unique',
};

/** Linienfarbe je Ton. */
export const GENOME_TONE_STROKES: Readonly<Record<GenomeTone, string>> = {
  collect: 'stroke-branch-collect',
  brood: 'stroke-branch-brood',
  combat: 'stroke-branch-combat',
  unique: 'stroke-branch-unique',
};

/** Textfarbe je Ton (Legende, Detailpanel, Beschriftung im Baum). */
export const GENOME_TONE_TEXTS: Readonly<Record<GenomeTone, string>> = {
  collect: 'text-branch-collect',
  brood: 'text-branch-brood',
  combat: 'text-branch-combat',
  unique: 'text-branch-unique',
};

/** Hintergrund je Ton (Punkte der Legende). */
export const GENOME_TONE_BACKGROUNDS: Readonly<Record<GenomeTone, string>> = {
  collect: 'bg-branch-collect',
  brood: 'bg-branch-brood',
  combat: 'bg-branch-combat',
  unique: 'bg-branch-unique',
};

/** Name eines beliebigen Eintrags im Baum: Wurzel, regulärer Knoten oder einzigartige Adaption. */
export function genomeEntryLabel(id: GenomeEntryId): string {
  if (id === GENOME_ROOT) {
    return GENOME_ROOT_LABEL;
  }
  return isGenomeNodeId(id) ? GENOME_NODE_LABELS[id] : UNIQUE_ADAPTATION_LABELS[id];
}
