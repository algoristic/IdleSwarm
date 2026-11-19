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
/** Schriftgrößen im Mockup (`viewBox`-Einheiten): Beschriftung `text-xs`, Kostenschild `text-2xs`. */
export const LABEL_SIZE = 12;
export const TAG_TEXT_SIZE = 10;
/** Mindestgrößen auf dem Bildschirm (US-08.06, US-08.07). */
export const MIN_TEXT_PX = 12;
export const MIN_HIT_PX = 44;
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
  /** Eckenradius: halbe Höhe (Pille). */
  readonly rx: number;
  /** Grundlinie des Texts, mittig im Schild. */
  readonly textX: number;
  readonly textY: number;
}

/** Beschriftung, Kostenschild und Ringe eines Knotens, relativ zu seinem Mittelpunkt. */
export interface NodeDecoration {
  readonly label: TreeLabel;
  readonly tag: TreeTag;
  /** Schriftgrößen im `viewBox`. */
  readonly labelSize: number;
  readonly tagTextSize: number;
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

/** Vergrößerung von Beschriftung und Kostenschild gegenüber dem Mockup; 1 = wie im Mockup. */
export interface TextScale {
  readonly label: number;
  readonly tag: number;
}

export const NO_TEXT_SCALE: TextScale = { label: 1, tag: 1 };

/**
 * Beschriftung, Kostenschild, Pulsring, Auswahlring und Fokusring eines Knotens mit Radius
 * `radius`, relativ zum Mittelpunkt. Die Beschriftung steht darunter oder seitlich etwas über der
 * Mitte; das Schild darunter bzw. gegenüber der Beschriftung. `scale` vergrößert Schrift und
 * Schild auf kleinen Bildschirmen ({@link treeTextScale}); die Abstände wachsen mit.
 */
export function nodeDecoration(
  radius: number,
  label: LabelSide,
  tag: TagSide,
  scale: TextScale = NO_TEXT_SCALE,
): NodeDecoration {
  return {
    label: labelPlacement(radius, label, scale.label),
    tag: tagPlacement(radius, label, tag, scale),
    labelSize: round(LABEL_SIZE * scale.label),
    tagTextSize: round(TAG_TEXT_SIZE * scale.tag),
    pulseRadius: radius + 5,
    selectionRadius: radius + 11,
    focusRadius: radius + 14,
  };
}

/**
 * Kleinster Abstand zweier Knotenmittelpunkte; bestimmt, wie groß der Baum mindestens gerendert
 * werden muss, damit Trefferflächen ohne Überschneidung {@link MIN_HIT_PX} breit sind.
 */
export function nearestDistances(points: readonly TreePoint[]): readonly number[] {
  return points.map((point, i) =>
    Math.min(
      ...points
        .filter((_other, j) => j !== i)
        .map((other) => Math.hypot(other.x - point.x, other.y - point.y)),
    ),
  );
}

/**
 * Kleinste gerenderte Kantenlänge des Baums in Pixeln: Bei ihr berühren sich die 44-px-Kreise der
 * beiden nächsten Knoten gerade. Darunter wird der Baum größer als die Bühne und verschiebbar.
 */
export function minTreeSize(points: readonly TreePoint[]): number {
  const nearest = Math.min(...nearestDistances(points));
  return Math.ceil((TREE_SIZE * MIN_HIT_PX) / nearest);
}

/**
 * Vergrößerung der Texte bei `pixelScale` (gerenderte Pixel je `viewBox`-Einheit), damit sie
 * mindestens {@link MIN_TEXT_PX} groß erscheinen. Unter `minScale` (der Baum wird dann ohnehin nicht
 * kleiner gerendert, außer auf breiten, niedrigen Desktops) wächst sie nicht weiter, damit sich
 * Beschriftungen und Schilder benachbarter Knoten nicht überlappen.
 */
export function treeTextScale(pixelScale: number, minScale: number): TextScale {
  const scale = Math.max(pixelScale > 0 && Number.isFinite(pixelScale) ? pixelScale : 1, minScale);
  return {
    label: round2(Math.max(1, MIN_TEXT_PX / (LABEL_SIZE * scale))),
    tag: round2(Math.max(1, MIN_TEXT_PX / (TAG_TEXT_SIZE * scale))),
  };
}

/**
 * Radius der Trefferfläche: auf dem Bildschirm mindestens 44 px breit, mindestens der Fokusring,
 * aber höchstens der halbe Abstand zum nächsten Knoten. So überdecken sich Nachbarn nie; bei
 * Konflikt teilt die Mitte (das nähere Zentrum gewinnt).
 */
export function hitRadius(focusRadius: number, nearest: number, pixelScale: number): number {
  const scale = pixelScale > 0 && Number.isFinite(pixelScale) ? pixelScale : 1;
  return round(Math.min(Math.max(focusRadius, MIN_HIT_PX / 2 / scale), nearest / 2));
}

function labelPlacement(radius: number, side: LabelSide, scale: number): TreeLabel {
  switch (side) {
    case 'below':
      return { x: 0, y: round(radius + 6 + LABEL_SIZE * scale), anchor: 'middle' };
    case 'start':
      return { x: radius + LABEL_GAP, y: round(-4 * scale), anchor: 'start' };
    case 'end':
      return { x: -(radius + LABEL_GAP), y: round(-4 * scale), anchor: 'end' };
  }
}

function tagPlacement(radius: number, label: LabelSide, side: TagSide, scale: TextScale): TreeTag {
  const width = TAG_WIDTH * scale.tag;
  const height = TAG_HEIGHT * scale.tag;
  if (side === 'opposite' && label !== 'below') {
    // Gegenüber der Beschriftung, auf Höhe der Knotenmitte.
    const direction = label === 'start' ? -1 : 1;
    const centerX = direction * (radius + TAG_GAP + width / 2);
    return tagAt(centerX, -height / 2, scale.tag);
  }
  // Unter der Beschriftung, wenn sie unter dem Knoten steht; sonst direkt unter dem Knoten.
  const top = label === 'below' ? radius + 14 + LABEL_SIZE * scale.label : radius + TAG_GAP;
  return tagAt(0, top, scale.tag);
}

function tagAt(centerX: number, top: number, scale: number): TreeTag {
  const width = TAG_WIDTH * scale;
  const height = TAG_HEIGHT * scale;
  return {
    x: round(centerX - width / 2),
    y: round(top),
    width: round(width),
    height: round(height),
    rx: round(height / 2),
    textX: round(centerX),
    textY: round(top + 12 * scale),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
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
