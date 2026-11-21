import type { Num } from '@app/shared/util/num/num';
import type { Position } from '@app/site/domain/models/map.model';

/** Koordinaten im `viewBox` der Sonar-Karte (`0 0 MAP_SIZE MAP_SIZE`), Zentrum = eigene Position. */
export const MAP_SIZE = 800;
export const MAP_CENTER = MAP_SIZE / 2;
/** Äußerster Distanzring; der Rand darunter bleibt für die Beschriftung der Ziele frei. */
export const MAP_RADIUS = 330;
/** Radius der eigenen Position; Routen beginnen an ihrem Rand, nicht im Zentrum. */
export const HERE_RADIUS = 30;
export const NODE_RADIUS_MIN = 11;
export const NODE_RADIUS_MAX = 20;
export const SPOKE_COUNT = 12;

/** Gleitkomma-Rest wie 5,000000001 soll keinen zusätzlichen Ring erzeugen. */
const RING_TOLERANCE = 1e-6;
/** Krümmung der Route zum gewählten Ziel als Anteil ihrer Länge (wie im Mockup K2). */
const ROUTE_BEND = 0.18;

export interface MapPoint {
  readonly x: number;
  readonly y: number;
}

export interface MapScale {
  /** Zahl der Distanzringe, ganzzahlig und mindestens 1. */
  readonly rings: number;
  /** `viewBox`-Einheiten je Distanzeinheit. */
  readonly unit: number;
}

export interface MapSpoke {
  readonly from: MapPoint;
  readonly to: MapPoint;
}

export interface MapTrail {
  /** Pfad von der ältesten sichtbaren Stelle bis zur eigenen Position; `null` ohne Route. */
  readonly path: string | null;
  /** Besuchte Futterstellen innerhalb der Karte, ohne die eigene Position. */
  readonly points: readonly MapPoint[];
}

export interface MapTravel {
  readonly path: string;
  /** Wo der Schwarm gerade ist, linear nach dem Fortschritt der Reise. */
  readonly swarm: MapPoint;
}

/**
 * Maßstab: so viele ganze Ringe, dass Reichweite und alle Ziele Platz haben. Der äußerste Ring
 * liegt immer bei {@link MAP_RADIUS}.
 */
export function mapScale(range: number, distances: readonly number[]): MapScale {
  const farthest = Math.max(range, ...distances);
  const rings = Math.max(1, Math.ceil(farthest - RING_TOLERANCE));
  return { rings, unit: MAP_RADIUS / rings };
}

/** Punkt der Spielebene relativ zur eigenen Position im `viewBox`. */
export function toMapPoint(position: Position, center: Position, unit: number): MapPoint {
  return {
    x: round(MAP_CENTER + (position.x - center.x) * unit),
    y: round(MAP_CENTER + (position.y - center.y) * unit),
  };
}

export function spokes(scale: MapScale): readonly MapSpoke[] {
  return Array.from({ length: SPOKE_COUNT }, (_v, i) => {
    const angle = (i / SPOKE_COUNT) * 2 * Math.PI;
    return {
      from: polar(scale.unit * 0.9, angle),
      to: polar(MAP_RADIUS, angle),
    };
  });
}

/**
 * Bisherige Route bis zur eigenen Position. Von der neuesten Stelle rückwärts bleibt sie sichtbar,
 * bis sie die Karte verlässt; dort wird sie am Rand abgeschnitten, ältere Stellen fallen weg.
 */
export function trail(route: readonly Position[], center: Position, unit: number): MapTrail {
  const kept: MapPoint[] = [];
  let edge: MapPoint | null = null;
  for (let i = route.length - 1; i >= 0; i--) {
    const point = toMapPoint(route[i], center, unit);
    if (radiusOf(point) > MAP_RADIUS) {
      const inner = kept.at(-1) ?? centerPoint();
      edge = clipToCircle(inner, point);
      break;
    }
    kept.push(point);
  }
  const visited = kept.filter((point) => radiusOf(point) > RING_TOLERANCE).reverse();
  const line = [...(edge === null ? [] : [edge]), ...visited, centerPoint()];
  return { path: line.length < 2 ? null : pathThrough(line), points: visited };
}

/** Sektor des Sonar-Sweeps (45°), dreht per CSS um das Zentrum. */
export function sweepPath(): string {
  const end = polar(MAP_RADIUS, -Math.PI / 4);
  return `M${MAP_CENTER} ${MAP_CENTER} L${MAP_CENTER + MAP_RADIUS} ${MAP_CENTER} A${MAP_RADIUS} ${MAP_RADIUS} 0 0 0 ${coord(end)} Z`;
}

/** Geschwungene Route vom Rand der eigenen Position zum Ziel; `null`, wenn das Ziel dort liegt. */
export function approachPath(target: MapPoint): string | null {
  const start = fromHereToward(target);
  if (start === null) {
    return null;
  }
  const dx = target.x - start.x;
  const dy = target.y - start.y;
  const control = {
    x: (start.x + target.x) / 2 - dy * ROUTE_BEND,
    y: (start.y + target.y) / 2 + dx * ROUTE_BEND,
  };
  return `M${coord(start)} Q${coord(control)} ${coord(target)}`;
}

/** Gerade Reiseroute vom Rand der eigenen Position zum Ziel, Fortschritt von 0 bis 1. */
export function travelLine(target: MapPoint, progress: number): MapTravel | null {
  const start = fromHereToward(target);
  if (start === null) {
    return null;
  }
  const share = Math.min(Math.max(progress, 0), 1);
  return {
    path: `M${coord(start)} L${coord(target)}`,
    swarm: {
      x: round(start.x + (target.x - start.x) * share),
      y: round(start.y + (target.y - start.y) * share),
    },
  };
}

/** Größe der Ziele auf der Karte: logarithmisch zwischen kleinstem und größtem Vorrat. */
export function nodeRadii(sizes: readonly (Num | null)[]): readonly number[] {
  const logs = sizes.map((size) => (size === null || !size.gt(0) ? null : log10(size)));
  const known = logs.filter((value): value is number => value !== null);
  const min = Math.min(...known);
  const max = Math.max(...known);
  return logs.map((value) => {
    if (value === null) {
      return NODE_RADIUS_MIN;
    }
    const share = max > min ? (value - min) / (max - min) : 0.5;
    return round(NODE_RADIUS_MIN + (NODE_RADIUS_MAX - NODE_RADIUS_MIN) * share);
  });
}

/** `stroke-dasharray` für einen Bogen mit dem Anteil 0 bis 1 am Kreis; `null` ohne Bogen. */
export function arcDash(radius: number, share: number): string | null {
  if (!(share > 0)) {
    return null;
  }
  const circumference = 2 * Math.PI * radius;
  return `${round(circumference * Math.min(share, 1))} ${round(circumference)}`;
}

/** Mindestgrößen auf dem Bildschirm (US-08.06, US-08.07): Schrift und Trefferflächen in Pixeln. */
export const MIN_TEXT_PX = 12;
export const MIN_HIT_PX = 44;
/** Ab diesem Maßstab (Pixel je `viewBox`-Einheit) wirken die Ziele wie im Mockup; darunter wachsen sie. */
export const SYMBOL_REFERENCE_SCALE = 0.6;
export const SYMBOL_ZOOM_MAX = 1.5;
/**
 * Mittlere Zeichenbreite von Nunito (halbfett) als Anteil der Schriftgröße; großzügig geschätzt,
 * damit sich geschätzte Beschriftungen eher zu früh als zu spät ausweichen.
 */
export const CHAR_WIDTH_EM = 0.58;
export const LINE_HEIGHT_EM = 1.2;
/** Abstand der Oberkante einer Zeile zur Grundlinie. */
const BASELINE_EM = 0.9;
/** Abstand zwischen Beschriftung und Ziel bzw. zwischen zwei Beschriftungen. */
const LABEL_GAP = 4;
/** Abstand der Ringbeschriftung zum Ring. */
export const RING_LABEL_GAP = 7;
/** Eckenzahl der Trefferfläche, wenn ein Nachbar sie beschneidet. */
const HIT_SEGMENTS = 32;

/** Rechteck im `viewBox`. */
export interface MapBox {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export interface MapCircle {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

/**
 * Schriftgröße im `viewBox`: die Größe aus dem Mockup, aber nie kleiner als {@link MIN_TEXT_PX}
 * auf dem Bildschirm. `pixelScale` = gerenderte Pixel je `viewBox`-Einheit.
 */
export function textSize(base: number, pixelScale: number): number {
  return round(Math.max(base, MIN_TEXT_PX / safeScale(pixelScale)));
}

/** Vergrößerung der Ziele auf kleinen Karten; auf großen bleibt sie 1 (Desktop wie im Mockup). */
export function symbolZoom(pixelScale: number): number {
  const zoom = SYMBOL_REFERENCE_SCALE / safeScale(pixelScale);
  return round(Math.min(Math.max(zoom, 1), SYMBOL_ZOOM_MAX) * 100) / 100;
}

/** Radius der Trefferfläche: mindestens der Fokusring, auf dem Bildschirm mindestens 44 px breit. */
export function hitRadius(focusRadius: number, pixelScale: number): number {
  return round(Math.max(focusRadius, MIN_HIT_PX / 2 / safeScale(pixelScale)));
}

/**
 * Trefferflächen der Ziele als Pfade relativ zu ihrem Mittelpunkt. Überschneiden sich zwei Kreise,
 * teilt die Mittelsenkrechte sie: Ein Tipp gehört dem Ziel mit dem näheren Mittelpunkt, unabhängig
 * von der Größe, weil man dorthin tippt, wo man die Kugel sieht. Liegen zwei Ziele genau
 * aufeinander, behält das frühere die Fläche; das spätere bekommt `null` und bleibt über die
 * Zielliste erreichbar.
 */
export function hitAreaPaths(circles: readonly MapCircle[]): readonly (string | null)[] {
  return circles.map((circle, i) => {
    let polygon: MapPoint[] | null = null;
    for (let j = 0; j < circles.length; j++) {
      const other = circles[j];
      const dx = other.x - circle.x;
      const dy = other.y - circle.y;
      const distance = Math.hypot(dx, dy);
      if (j === i || distance >= circle.radius + other.radius) {
        continue;
      }
      if (distance < RING_TOLERANCE) {
        if (j < i) {
          return null;
        }
        continue;
      }
      polygon = clipToHalfPlane(polygon ?? circlePolygon(circle.radius), dx, dy);
    }
    if (polygon === null) {
      return circlePath(circle.radius);
    }
    return polygon.length < 3 ? null : `${pathThrough(polygon)} Z`;
  });
}

/** Wo eine Beschriftung relativ zu ihrem Ziel steht. */
export type LabelSide = 'below' | 'above' | 'right' | 'left';
export const LABEL_SIDES: readonly LabelSide[] = ['below', 'above', 'right', 'left'];

/** Beschriftung eines Ziels, das bei (`x`, `y`) liegt. */
export interface LabelRequest {
  readonly x: number;
  readonly y: number;
  /** Radius, den das Ziel selbst belegt (Kugel samt Ringen). */
  readonly clearance: number;
  /** Zusätzlich belegter Platz über dem Ziel (z. B. die ◆-Markierung). */
  readonly clearanceTop: number;
  /** Zeichenzahl je Zeile; die erste Zeile ist der Name, weitere sind entbehrlich. */
  readonly lines: readonly number[];
  /** Kleiner = früher platziert. Bei Gleichstand gilt die Reihenfolge. */
  readonly priority: number;
  /** Muss sichtbar bleiben (gewähltes Ziel, eigene Position), notfalls mit Überschneidung. */
  readonly required: boolean;
  /** Eigene Schriftgröße; ohne gilt die gemeinsame von {@link placeLabels}. */
  readonly fontSize?: number;
}

export interface LabelPlacement {
  readonly side: LabelSide;
  readonly anchor: 'start' | 'middle' | 'end';
  /** Grundlinie der ersten Zeile relativ zum Ziel. */
  readonly dx: number;
  readonly dy: number;
  /** Abstand der Grundlinien weiterer Zeilen. */
  readonly lineHeight: number;
  /** Wie viele Zeilen Platz haben (mindestens 1). */
  readonly lines: number;
}

/**
 * Einfache, deterministische Kollisionsvermeidung: Nach Priorität bekommt jede Beschriftung die
 * erste freie Seite (unten, oben, rechts, links), zuerst mit allen Zeilen, dann nur mit dem Namen.
 * Frei heißt: im `viewBox`, ohne Überschneidung mit anderen Zielen, den `obstacles` und bereits
 * gesetzten Beschriftungen. Findet sich kein Platz, entfällt die Beschriftung (`null`), außer sie
 * ist `required`; dann steht sie unten.
 */
export function placeLabels(
  requests: readonly LabelRequest[],
  obstacles: readonly MapBox[],
  fontSize: number,
): readonly (LabelPlacement | null)[] {
  const order = requests
    .map((request, index) => ({ request, index }))
    .sort((a, b) => a.request.priority - b.request.priority || a.index - b.index);
  const discs = requests.map(requestDisc);
  const placed: MapBox[] = [];
  const result: (LabelPlacement | null)[] = requests.map(() => null);
  for (const { request, index } of order) {
    const blocked = [...obstacles, ...discs.filter((_box, i) => i !== index), ...placed];
    const fits = (box: MapBox): boolean =>
      insideMap(box) && blocked.every((other) => !overlaps(box, other));
    let chosen: { placement: LabelPlacement; box: MapBox } | null = null;
    for (let lines = request.lines.length; lines >= 1 && chosen === null; lines--) {
      for (const side of LABEL_SIDES) {
        const candidate = labelCandidate(request, side, lines, request.fontSize ?? fontSize);
        if (fits(candidate.box)) {
          chosen = candidate;
          break;
        }
      }
    }
    if (chosen === null && request.required) {
      chosen = labelCandidate(request, 'below', 1, request.fontSize ?? fontSize);
    }
    if (chosen !== null) {
      placed.push(chosen.box);
      result[index] = chosen.placement;
    }
  }
  return result;
}

/** Rechteck einer einzeiligen Beschriftung mit `chars` Zeichen, Grundlinie bei `y`. */
export function textBox(
  x: number,
  y: number,
  chars: number,
  fontSize: number,
  anchor: 'start' | 'middle' | 'end',
): MapBox {
  const width = chars * CHAR_WIDTH_EM * fontSize;
  const left = anchor === 'start' ? x : anchor === 'end' ? x - width : x - width / 2;
  const top = y - BASELINE_EM * fontSize;
  return { left, top, right: left + width, bottom: top + LINE_HEIGHT_EM * fontSize };
}

/**
 * Grundlinie der Beschriftung eines Rings mit `radius`: unter dem Ring auf der senkrechten Achse.
 * Unten statt oben (Mockup), weil oben der Titel der Umgebung die Karte überdeckt (Desktop, Tablet);
 * unten liegt auf keinem Layout ein Panel über der Karte.
 */
export function ringLabelBaseline(radius: number, fontSize: number): number {
  return round(MAP_CENTER + radius + RING_LABEL_GAP + BASELINE_EM * fontSize);
}

/**
 * Welche Beschriftungen stehen bleiben, wenn sich feste Beschriftungen (z. B. der Ringe) überlagern:
 * in der gegebenen Reihenfolge jede, die keine bereits behaltene berührt.
 */
export function keepApart(boxes: readonly MapBox[]): readonly boolean[] {
  const kept: MapBox[] = [];
  return boxes.map((box) => {
    const free = kept.every((other) => !overlaps(box, other));
    if (free) {
      kept.push(box);
    }
    return free;
  });
}

/** Ob `box` keines der `blockers` berührt. */
export function clearOf(box: MapBox, blockers: readonly MapBox[]): boolean {
  return blockers.every((other) => !overlaps(box, other));
}

export function circleBox(x: number, y: number, radius: number): MapBox {
  return { left: x - radius, top: y - radius, right: x + radius, bottom: y + radius };
}

function labelCandidate(
  request: LabelRequest,
  side: LabelSide,
  lines: number,
  fontSize: number,
): { placement: LabelPlacement; box: MapBox } {
  const chars = Math.max(...request.lines.slice(0, lines));
  const width = chars * CHAR_WIDTH_EM * fontSize;
  const lineHeight = LINE_HEIGHT_EM * fontSize;
  const height = lines * lineHeight;
  const gap = request.clearance + LABEL_GAP;
  let left: number;
  let top: number;
  let anchor: LabelPlacement['anchor'];
  let dx: number;
  switch (side) {
    case 'below':
      left = -width / 2;
      top = gap;
      anchor = 'middle';
      dx = 0;
      break;
    case 'above':
      left = -width / 2;
      top = -(Math.max(request.clearance, request.clearanceTop) + LABEL_GAP) - height;
      anchor = 'middle';
      dx = 0;
      break;
    case 'right':
      left = gap;
      top = -height / 2;
      anchor = 'start';
      dx = gap;
      break;
    case 'left':
      left = -gap - width;
      top = -height / 2;
      anchor = 'end';
      dx = -gap;
      break;
  }
  return {
    placement: {
      side,
      anchor,
      dx: round(dx),
      dy: round(top + BASELINE_EM * fontSize),
      lineHeight: round(lineHeight),
      lines,
    },
    box: {
      left: request.x + left,
      top: request.y + top,
      right: request.x + left + width,
      bottom: request.y + top + height,
    },
  };
}

/** Platz, den ein Ziel samt Markierung darüber belegt. */
export function requestDisc(request: LabelRequest): MapBox {
  const box = circleBox(request.x, request.y, request.clearance);
  return { ...box, top: Math.min(box.top, request.y - request.clearanceTop) };
}

function insideMap(box: MapBox): boolean {
  return box.left >= 0 && box.top >= 0 && box.right <= MAP_SIZE && box.bottom <= MAP_SIZE;
}

function overlaps(a: MapBox, b: MapBox): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

function circlePolygon(radius: number): MapPoint[] {
  return Array.from({ length: HIT_SEGMENTS }, (_v, i) => {
    const angle = (i / HIT_SEGMENTS) * 2 * Math.PI;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
}

/**
 * Sutherland-Hodgman an der Mittelsenkrechten zum Nachbarn bei (`dx`, `dy`): Es bleibt die Seite
 * zum eigenen Mittelpunkt, also alle Punkte p mit p · d ≤ |d|² / 2.
 */
function clipToHalfPlane(polygon: readonly MapPoint[], dx: number, dy: number): MapPoint[] {
  const limit = (dx * dx + dy * dy) / 2;
  const side = (point: MapPoint): number => point.x * dx + point.y * dy - limit;
  const result: MapPoint[] = [];
  polygon.forEach((current, i) => {
    const previous = polygon[(i + polygon.length - 1) % polygon.length];
    const currentSide = side(current);
    const previousSide = side(previous);
    if (currentSide <= 0 !== previousSide <= 0) {
      const t = previousSide / (previousSide - currentSide);
      result.push({
        x: previous.x + (current.x - previous.x) * t,
        y: previous.y + (current.y - previous.y) * t,
      });
    }
    if (currentSide <= 0) {
      result.push(current);
    }
  });
  return result;
}

function circlePath(radius: number): string {
  const r = round(radius);
  return `M${-r} 0 A${r} ${r} 0 1 0 ${r} 0 A${r} ${r} 0 1 0 ${-r} 0 Z`;
}

/** Ohne Messung (Tests, erster Frame) gilt der Maßstab 1. */
function safeScale(pixelScale: number): number {
  return pixelScale > 0 && Number.isFinite(pixelScale) ? pixelScale : 1;
}

function fromHereToward(target: MapPoint): MapPoint | null {
  const dx = target.x - MAP_CENTER;
  const dy = target.y - MAP_CENTER;
  const length = Math.hypot(dx, dy);
  if (length <= HERE_RADIUS) {
    return null;
  }
  return {
    x: MAP_CENTER + (dx / length) * HERE_RADIUS,
    y: MAP_CENTER + (dy / length) * HERE_RADIUS,
  };
}

/** Schnittpunkt der Strecke von `inside` nach `outside` mit dem äußersten Ring. */
function clipToCircle(inside: MapPoint, outside: MapPoint): MapPoint {
  const ax = inside.x - MAP_CENTER;
  const ay = inside.y - MAP_CENTER;
  const dx = outside.x - inside.x;
  const dy = outside.y - inside.y;
  // |a + t·d| = R nach t lösen; die Wurzel mit t in [0, 1] liegt auf der Strecke.
  const a = dx * dx + dy * dy;
  const b = 2 * (ax * dx + ay * dy);
  const c = ax * ax + ay * ay - MAP_RADIUS * MAP_RADIUS;
  const t = (-b + Math.sqrt(Math.max(b * b - 4 * a * c, 0))) / (2 * a);
  return { x: round(inside.x + dx * t), y: round(inside.y + dy * t) };
}

function pathThrough(points: readonly MapPoint[]): string {
  return points.map((point, i) => `${i === 0 ? 'M' : 'L'}${coord(point)}`).join(' ');
}

function polar(radius: number, angle: number): MapPoint {
  return {
    x: round(MAP_CENTER + Math.cos(angle) * radius),
    y: round(MAP_CENTER + Math.sin(angle) * radius),
  };
}

function centerPoint(): MapPoint {
  return { x: MAP_CENTER, y: MAP_CENTER };
}

function radiusOf(point: MapPoint): number {
  return Math.hypot(point.x - MAP_CENTER, point.y - MAP_CENTER);
}

function log10(value: Num): number {
  return value.exponent + Math.log10(value.mantissa);
}

function coord(point: MapPoint): string {
  return `${round(point.x)} ${round(point.y)}`;
}

/** Eine Nachkommastelle reicht im `viewBox` von 800 und hält Pfade kurz. */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}
