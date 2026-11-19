import type { LabelSide, PolarPosition, TagSide } from '../../domain/genome-tree-logic';
import type { GenomeEntryId } from '../models/genome-entry.model';

/** Lage eines Knotens im radialen Baum und wo Beschriftung und Kostenschild stehen. */
export interface GenomeNodeLayout extends PolarPosition {
  readonly label: LabelSide;
  readonly tag: TagSide;
}

/**
 * Anordnung nach dem Mockup K2-K (TK §6: UI-Daten, nicht Spieldaten): Sammeln nach links oben,
 * Kampf nach rechts oben, Brut nach unten; je Stufe 60 Einheiten weiter außen. Die Äste
 * biegen leicht ab, die Beschriftungen stehen seitlich, damit sie nicht in den nächsten Knoten
 * laufen. Einzigartige Adaptionen hängen neben ihrem Anker.
 */
export const GENOME_LAYOUT: Readonly<Record<GenomeEntryId, GenomeNodeLayout>> = {
  root: { angle: 0, radius: 0, label: 'below', tag: 'below' },
  'cilia-1': { angle: -150, radius: 95, label: 'below', tag: 'below' },
  'cilia-2': { angle: -149, radius: 155, label: 'start', tag: 'below' },
  'filter-feeder': { angle: -148, radius: 215, label: 'start', tag: 'below' },
  chemotaxis: { angle: -147, radius: 275, label: 'start', tag: 'below' },
  flagellum: { angle: -146, radius: 335, label: 'start', tag: 'below' },
  'yolk-reserve': { angle: 90, radius: 95, label: 'start', tag: 'opposite' },
  'brood-combs': { angle: 95, radius: 155, label: 'start', tag: 'opposite' },
  'second-gland': { angle: 100, radius: 215, label: 'start', tag: 'opposite' },
  'nurse-cells': { angle: 105, radius: 275, label: 'start', tag: 'opposite' },
  budding: { angle: 108, radius: 332, label: 'start', tag: 'opposite' },
  'acid-vacuole': { angle: -30, radius: 95, label: 'below', tag: 'below' },
  autophagy: { angle: -31, radius: 155, label: 'end', tag: 'below' },
  'nettle-cells': { angle: -32, radius: 215, label: 'end', tag: 'below' },
  'chalk-shell': { angle: -33, radius: 275, label: 'end', tag: 'below' },
  'spine-cells': { angle: -34, radius: 335, label: 'end', tag: 'below' },
  thermosynthesis: { angle: -120, radius: 200, label: 'start', tag: 'below' },
  'algal-symbiosis': { angle: 175, radius: 170, label: 'below', tag: 'below' },
  'crystal-sense': { angle: 45, radius: 200, label: 'below', tag: 'below' },
  'sulfur-shell': { angle: -75, radius: 200, label: 'below', tag: 'below' },
};

/** Organellen in den Lücken zwischen den Ästen: Lage und Halbachsen. */
export interface OrganelleLayout extends PolarPosition {
  readonly rx: number;
  readonly ry: number;
}

export const ORGANELLE_LAYOUT: readonly OrganelleLayout[] = [
  { angle: 150, radius: 300, rx: 26, ry: 12 },
  { angle: 140, radius: 120, rx: 10, ry: 7 },
  { angle: 25, radius: 320, rx: 30, ry: 14 },
  { angle: 20, radius: 160, rx: 12, ry: 8 },
  { angle: -90, radius: 330, rx: 18, ry: 10 },
  { angle: -100, radius: 110, rx: 10, ry: 6 },
  { angle: 60, radius: 300, rx: 14, ry: 8 },
];
