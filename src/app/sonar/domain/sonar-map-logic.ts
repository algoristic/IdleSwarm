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
