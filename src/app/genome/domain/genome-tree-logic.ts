/**
 * Geometrie des radialen Genoms im `viewBox` (`0 0 TREE_SIZE TREE_SIZE`), Zentrum = Wurzel. Die
 * Positionen der Knoten (Winkel, Radius) sind UI-Daten in `genome/ui` (TK §6); hier stehen nur die
 * reinen Rechnungen dazu.
 */
export const TREE_SIZE = 800;
export const TREE_CENTER = TREE_SIZE / 2;
/** Zellkern; alle Knoten und Beschriftungen liegen darin. */
export const NUCLEUS_RADIUS = 372;
/** Gepunkteter Ring knapp innerhalb des Zellkerns (Mockup K2-K). */
export const NUCLEUS_RING_RADIUS = 356;
/** Mittlerer Radius der gewellten Membran um den Zellkern. */
export const MEMBRANE_RADIUS = 392;
export const ROOT_RADIUS = 26;
export const NODE_RADIUS = 19;

/** Abstand von Beschriftung und Kostenschild zum Knotenrand. */
const LABEL_GAP = 8;
const TAG_GAP = 6;
export const TAG_WIDTH = 48;
export const TAG_HEIGHT = 16;
/** Wellen der Membran: zwei überlagerte Sinusformen wie im Mockup. */
const MEMBRANE_SEGMENTS = 120;
const MEMBRANE_WAVES: readonly {
  readonly count: number;
  readonly amplitude: number;
  readonly phase: number;
}[] = [
  { count: 7, amplitude: 5, phase: 0 },
  { count: 3, amplitude: 4, phase: 1 },
];

export interface TreePoint {
  readonly x: number;
  readonly y: number;
}

/** Lage im Baum: Winkel in Grad (0° = rechts, im Uhrzeigersinn) und Abstand zur Wurzel. */
export interface PolarPosition {
  readonly angle: number;
  readonly radius: number;
}

/** Wo die Beschriftung eines Knotens steht: darunter, rechts (`start`) oder links (`end`). */
export type LabelSide = 'below' | 'start' | 'end';

/** Wo das Kostenschild steht: unter dem Knoten (bzw. unter der Beschriftung) oder gegenüber. */
export type TagSide = 'below' | 'opposite';

export interface TreeLabel {
  readonly x: number;
  readonly y: number;
  readonly anchor: 'start' | 'middle' | 'end';
}

export interface TreeTag {
  /** Linke obere Ecke des Schilds. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Grundlinie des Texts, mittig im Schild. */
  readonly textX: number;
  readonly textY: number;
}

/** Beschriftung, Kostenschild und Ringe eines Knotens, relativ zu seinem Mittelpunkt. */
export interface NodeDecoration {
  readonly label: TreeLabel;
  readonly tag: TreeTag;
  readonly pulseRadius: number;
  readonly selectionRadius: number;
  readonly focusRadius: number;
}

/** Punkt im `viewBox` zu einer Lage im Baum. */
export function polarPoint(position: PolarPosition): TreePoint {
  const angle = toRadians(position.angle);
  return {
    x: round(TREE_CENTER + Math.cos(angle) * position.radius),
    y: round(TREE_CENTER + Math.sin(angle) * position.radius),
  };
}

/** `transform` einer Knotengruppe, deren Inhalt relativ zum Mittelpunkt gezeichnet ist. */
export function translate(point: TreePoint): string {
  return `translate(${point.x} ${point.y})`;
}

/**
 * Gebogener Ast von `parent` nach `child` (Mockup K2-K): Der Kontrollpunkt liegt auf dem mittleren
 * Radius im Winkel des Elternknotens, an der Wurzel im Winkel des Kindes. So wachsen die Äste
 * organisch nach außen.
 */
export function branchPath(parent: PolarPosition, child: PolarPosition, fromRoot: boolean): string {
  const from = polarPoint(parent);
  const to = polarPoint(child);
  const control = polarPoint({
    angle: fromRoot ? child.angle : parent.angle,
    radius: (parent.radius + child.radius) / 2,
  });
  return `M${coord(from)} Q${coord(control)} ${coord(to)}`;
}

/** Gewellte, geschlossene Membran um den Zellkern. */
export function membranePath(): string {
  const points = Array.from({ length: MEMBRANE_SEGMENTS + 1 }, (_v, i) => {
    const angle = (i / MEMBRANE_SEGMENTS) * 2 * Math.PI;
    const radius = MEMBRANE_WAVES.reduce(
      (sum, wave) => sum + Math.sin(angle * wave.count + wave.phase) * wave.amplitude,
      MEMBRANE_RADIUS,
    );
    return {
      x: round(TREE_CENTER + Math.cos(angle) * radius),
      y: round(TREE_CENTER + Math.sin(angle) * radius),
    };
  });
  return `${points.map((point, i) => `${i === 0 ? 'M' : 'L'}${coord(point)}`).join(' ')} Z`;
}

/**
 * Organelle als Ellipse in Umfangsrichtung (Mockup K2-K); der hellere Kern ist um `(-2, -2)`
 * versetzt und halb so groß. Gezeichnet relativ zu `transform`.
 */
export interface TreeOrganelle {
  readonly transform: string;
  readonly rx: number;
  readonly ry: number;
  readonly innerRx: number;
  readonly innerRy: number;
}

const ORGANELLE_CORE_SHARE = 0.45;

export function organelle(position: PolarPosition, rx: number, ry: number): TreeOrganelle {
  const center = polarPoint(position);
  return {
    transform: `translate(${center.x} ${center.y}) rotate(${round(position.angle + 90)})`,
    rx,
    ry,
    innerRx: round(rx * ORGANELLE_CORE_SHARE),
    innerRy: round(ry * ORGANELLE_CORE_SHARE),
  };
}

/**
 * Beschriftung, Kostenschild, Pulsring, Auswahlring und Fokusring eines Knotens mit Radius
 * `radius`, relativ zum Mittelpunkt. Die Beschriftung steht darunter oder seitlich etwas über der
 * Mitte; das Schild darunter bzw. gegenüber der Beschriftung.
 */
export function nodeDecoration(radius: number, label: LabelSide, tag: TagSide): NodeDecoration {
  return {
    label: labelPlacement(radius, label),
    tag: tagPlacement(radius, label, tag),
    pulseRadius: radius + 5,
    selectionRadius: radius + 11,
    focusRadius: radius + 14,
  };
}

function labelPlacement(radius: number, side: LabelSide): TreeLabel {
  switch (side) {
    case 'below':
      return { x: 0, y: radius + 18, anchor: 'middle' };
    case 'start':
      return { x: radius + LABEL_GAP, y: -4, anchor: 'start' };
    case 'end':
      return { x: -(radius + LABEL_GAP), y: -4, anchor: 'end' };
  }
}

function tagPlacement(radius: number, label: LabelSide, side: TagSide): TreeTag {
  if (side === 'opposite' && label !== 'below') {
    // Gegenüber der Beschriftung, auf Höhe der Knotenmitte.
    const direction = label === 'start' ? -1 : 1;
    const centerX = direction * (radius + TAG_GAP + TAG_WIDTH / 2);
    return tagAt(centerX, -TAG_HEIGHT / 2);
  }
  // Unter der Beschriftung, wenn sie unter dem Knoten steht; sonst direkt unter dem Knoten.
  const top = label === 'below' ? radius + 26 : radius + TAG_GAP;
  return tagAt(0, top);
}

function tagAt(centerX: number, top: number): TreeTag {
  return {
    x: round(centerX - TAG_WIDTH / 2),
    y: round(top),
    width: TAG_WIDTH,
    height: TAG_HEIGHT,
    textX: round(centerX),
    textY: round(top + 12),
  };
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function coord(point: TreePoint): string {
  return `${point.x} ${point.y}`;
}

/** Eine Nachkommastelle reicht im `viewBox` von 800 und hält Pfade kurz. */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}
