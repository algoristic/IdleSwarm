import type { ZoomDirection } from './models/shell-mode.model';

// Touch-Eingabe der Shell (US-08.06, TK §8.3): Pinch aus zwei Fingern wechselt den Modus.

/** Auseinander um mindestens diesen Faktor: hinein Richtung Genom (wie Mausrad nach oben). */
export const PINCH_SPREAD_RATIO = 1.25;
/** Zusammen auf höchstens diesen Faktor: hinaus Richtung Karte (wie Mausrad nach unten). */
export const PINCH_SQUEEZE_RATIO = 0.8;
/** Kleinster Bezugsabstand in Pixeln; dicht beieinander liegende Finger wären sonst zu empfindlich. */
export const PINCH_MIN_DISTANCE = 24;
/** So lange nach dem Lösen des letzten Fingers zählt ein Klick als Rest der Geste. */
export const PINCH_CLICK_GUARD_MS = 400;

export interface PinchPoint {
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

export interface PinchState {
  readonly points: readonly PinchPoint[];
  /** Bezugsabstand der zwei Finger; `null`, solange nicht genau zwei aufliegen oder gesperrt ist. */
  readonly startDistance: number | null;
  /** Die Geste hat gewechselt oder mehr als zwei Finger gesehen; gilt, bis alle Finger los sind. */
  readonly locked: boolean;
  /** Seit dem ersten Finger lagen mindestens zwei auf: Die Geste ist kein Tippen. */
  readonly multiTouch: boolean;
}

export interface PinchMove {
  readonly state: PinchState;
  readonly zoom: ZoomDirection | null;
}

export interface PinchRelease {
  readonly state: PinchState;
  /** Der letzte Finger einer Geste mit mehreren Fingern ist los; ein folgender Klick ist keiner. */
  readonly endedMultiTouch: boolean;
}

export const PINCH_IDLE: PinchState = {
  points: [],
  startDistance: null,
  locked: false,
  multiTouch: false,
};

export function pointDistance(a: PinchPoint, b: PinchPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Zoomrichtung zu Bezugs- und aktuellem Abstand; `null` innerhalb der Schwellen. */
export function pinchZoom(startDistance: number, distance: number): ZoomDirection | null {
  const ratio =
    Math.max(distance, PINCH_MIN_DISTANCE) / Math.max(startDistance, PINCH_MIN_DISTANCE);
  if (ratio >= PINCH_SPREAD_RATIO) {
    return 'in';
  }
  return ratio <= PINCH_SQUEEZE_RATIO ? 'out' : null;
}

/** Ein Finger setzt auf. Ab dem zweiten zählt der Abstand, ab dem dritten ist die Geste gesperrt. */
export function pinchDown(state: PinchState, point: PinchPoint): PinchState {
  const points = [...state.points.filter((p) => p.id !== point.id), point];
  const locked = state.locked || points.length > 2;
  return {
    points,
    startDistance: baseline(points, locked),
    locked,
    multiTouch: state.multiTouch || points.length > 1,
  };
}

/** Ein Finger bewegt sich. Höchstens ein Wechsel je Geste, danach ist sie gesperrt. */
export function pinchMove(state: PinchState, point: PinchPoint): PinchMove {
  if (!state.points.some((p) => p.id === point.id)) {
    return { state, zoom: null };
  }
  const points = state.points.map((p) => (p.id === point.id ? point : p));
  const [first, second] = points;
  const zoom =
    state.startDistance !== null && first && second
      ? pinchZoom(state.startDistance, pointDistance(first, second))
      : null;
  const locked = state.locked || zoom !== null;
  return {
    state: { ...state, points, locked, startDistance: locked ? null : state.startDistance },
    zoom,
  };
}

/** Ein Finger ist los (`pointerup` oder `pointercancel`). Ohne Finger beginnt alles neu. */
export function pinchUp(state: PinchState, id: number): PinchRelease {
  if (!state.points.some((p) => p.id === id)) {
    return { state, endedMultiTouch: false };
  }
  const points = state.points.filter((p) => p.id !== id);
  if (points.length === 0) {
    return { state: PINCH_IDLE, endedMultiTouch: state.multiTouch };
  }
  return {
    state: { ...state, points, startDistance: baseline(points, state.locked) },
    endedMultiTouch: false,
  };
}

function baseline(points: readonly PinchPoint[], locked: boolean): number | null {
  const [first, second] = points;
  return !locked && points.length === 2 && first && second ? pointDistance(first, second) : null;
}
