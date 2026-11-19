import type { GenomeNodeId, UniqueAdaptationId } from '../../domain/models/genome.model';

/** Kurzbeschreibung der Wurzel im Detailpanel (Mockup K2-K). */
export const GENOME_ROOT_DESCRIPTION = $localize`:@@uiGenome-genomeDescriptions-root:Ausgangspunkt des Schwarms. Von hier wachsen alle Äste.`;

/**
 * Kurzbeschreibungen der regulären Adaptionen (Game-Design §4.14). Ohne Zahlen: Die Werte kommen
 * aus `params` und stehen im Detailpanel als „vorher → nachher“.
 */
export const GENOME_NODE_DESCRIPTIONS: Readonly<Record<GenomeNodeId, string>> = {
  'cilia-1': $localize`:@@uiGenome-genomeDescriptions-node-cilia1:Drohnen bewegen sich schneller zwischen Futterstelle und Schwarm und sammeln mehr.`,
  'cilia-2': $localize`:@@uiGenome-genomeDescriptions-node-cilia2:Drohnen bewegen sich noch schneller und sammeln noch mehr.`,
  'filter-feeder': $localize`:@@uiGenome-genomeDescriptions-node-filterFeeder:Der Schwarm filtert Partikel aus dem Wasser und macht häufiger Funde.`,
  chemotaxis: $localize`:@@uiGenome-genomeDescriptions-node-chemotaxis:Der Schwarm wittert Futterstellen über größere Distanz.`,
  flagellum: $localize`:@@uiGenome-genomeDescriptions-node-flagellum:Eine Geißel treibt die Drohnen an; ihre Sammelleistung steigt kräftig.`,
  'yolk-reserve': $localize`:@@uiGenome-genomeDescriptions-node-yolkReserve:Königinnen legen mehr Eier.`,
  'brood-combs': $localize`:@@uiGenome-genomeDescriptions-node-broodCombs:Jede Königin trägt einen größeren Schwarm.`,
  'second-gland': $localize`:@@uiGenome-genomeDescriptions-node-secondGland:Eine zweite Drüse bringt einen zusätzlichen Pheromonpunkt.`,
  'nurse-cells': $localize`:@@uiGenome-genomeDescriptions-node-nurseCells:Ammenzellen pflegen die Brut; Königinnen legen noch mehr Eier.`,
  budding: $localize`:@@uiGenome-genomeDescriptions-node-budding:Der Schwarm wächst durch Knospung; jede Königin trägt deutlich mehr.`,
  'acid-vacuole': $localize`:@@uiGenome-genomeDescriptions-node-acidVacuole:Soldaten greifen stärker an.`,
  autophagy: $localize`:@@uiGenome-genomeDescriptions-node-autophagy:Gefallene Soldaten werden zu Nahrung, und Opfern bringt mehr ein.`,
  'nettle-cells': $localize`:@@uiGenome-genomeDescriptions-node-nettleCells:Nesselzellen lähmen die Abwehr; weniger Verluste beim Einnehmen.`,
  'chalk-shell': $localize`:@@uiGenome-genomeDescriptions-node-chalkShell:Ein Kalkpanzer schützt die Soldaten; noch weniger Verluste.`,
  'spine-cells': $localize`:@@uiGenome-genomeDescriptions-node-spineCells:Stachelzellen machen jeden Soldaten deutlich gefährlicher.`,
};

/** Kurzbeschreibungen der einzigartigen Adaptionen (Game-Design §4.14, US-06.02). */
export const UNIQUE_ADAPTATION_DESCRIPTIONS: Readonly<Record<UniqueAdaptationId, string>> = {
  thermosynthesis: $localize`:@@uiGenome-genomeDescriptions-unique-thermosynthesis:Einzigartig – gewinnt Energie aus der Hitze der Schlote.`,
  'algal-symbiosis': $localize`:@@uiGenome-genomeDescriptions-unique-algalSymbiosis:Einzigartig – Chloroplasten helfen beim Sammeln auf Algenmatten.`,
  'crystal-sense': $localize`:@@uiGenome-genomeDescriptions-unique-crystalSense:Einzigartig – ein Urzeitkristall schärft den Blick für Funde.`,
  'sulfur-shell': $localize`:@@uiGenome-genomeDescriptions-unique-sulfurShell:Einzigartig – ein Panzer aus Schwefelperlen macht Soldaten stärker.`,
};
