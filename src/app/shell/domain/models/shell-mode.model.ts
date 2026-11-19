/** Modi der K2-Shell in Zoom-Reihenfolge: Karte (herausgezoomt), Szene, Genom (hineingezoomt). */
export const SHELL_MODES = ['map', 'scene', 'gen'] as const;
export type ShellMode = (typeof SHELL_MODES)[number];

/** Zoomrichtung: `out` Richtung Karte, `in` Richtung Genom. */
export type ZoomDirection = 'out' | 'in';

/** Größe des sichtbaren Bereichs in CSS-Pixeln. */
export interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

/** Kamera der Welt-Ebene je Modus (Mockup K2-K `applyCamera`), in CSS-Pixeln. */
export interface WorldCamera {
  readonly scale: number;
  /** Radius von `clip-path: circle()` vor der Skalierung. */
  readonly clipRadius: number;
  /** Mittelpunkt von Skalierung und Ausschnitt. */
  readonly centerX: number;
  readonly centerY: number;
  readonly blur: number;
  readonly brightness: number;
}

/** CSS-Werte der Welt-Ebene, wie sie die Shell bindet. */
export interface WorldCameraStyle {
  readonly transformOrigin: string;
  readonly transform: string;
  readonly clipPath: string;
  readonly filter: string;
}
