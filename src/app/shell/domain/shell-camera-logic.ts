import { HERE_RADIUS, MAP_SIZE } from '@app/sonar/domain/sonar-map-logic';

import type {
  ShellMode,
  ViewportSize,
  WorldCamera,
  WorldCameraStyle,
} from './models/shell-mode.model';

// UI-Konstanten der Kamera (Mockup K2-K `layout`, `applyCamera`), keine Spielbalance.

/** Kleinste Kantenlänge von Sonar-Karte und Genom (`--ms`). */
export const STAGE_SIZE_MIN = 360;
/** Anteil der Höhe, den Karte und Genom höchstens einnehmen. */
export const STAGE_HEIGHT_SHARE = 0.86;
/** Breite, die links und rechts für Zoom-Leiste und Detailpanel frei bleibt. */
export const STAGE_SIDE_RESERVE = 720;
/** Rand zum Viewport, damit die Bühne auf schmalen Geräten nie überläuft. */
export const STAGE_GUTTER = 16;

/** Radius des Ausschnitts der Welt im Kartenmodus vor der Skalierung. */
export const MAP_CLIP_RADIUS = 300;
export const MAP_BRIGHTNESS = 1.15;
export const GENOME_SCALE = 2.8;
export const GENOME_BLUR = 7;
export const GENOME_BRIGHTNESS = 0.4;

/**
 * Kantenlänge von Sonar-Karte und Genom in Pixeln: wie im Mockup `max(360, min(h · 0,86, w − 720))`,
 * aber nie breiter als der Viewport abzüglich Rand (schmale Geräte, Feinschliff in AP 1.4.5).
 */
export function stageSize({ width, height }: ViewportSize): number {
  const desktop = Math.max(
    STAGE_SIZE_MIN,
    Math.min(height * STAGE_HEIGHT_SHARE, width - STAGE_SIDE_RESERVE),
  );
  return Math.max(0, Math.floor(Math.min(desktop, width - 2 * STAGE_GUTTER)));
}

/**
 * Kamera der Welt-Ebene. Szene: unverändert. Karte: Die Welt schrumpft auf die eigene Position im
 * Kartenzentrum (Radius `HERE_RADIUS` im `viewBox` der Karte). Genom: vergrößert, unscharf und
 * abgedunkelt hinter dem Zellkern.
 */
export function worldCamera(mode: ShellMode, viewport: ViewportSize, size: number): WorldCamera {
  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;
  // Deckt den ganzen Viewport ab; gleiche Form wie im Kartenmodus, damit `clip-path` überblendet.
  const fullRadius = Math.hypot(viewport.width, viewport.height);
  switch (mode) {
    case 'map':
      return {
        scale: (HERE_RADIUS * size) / MAP_SIZE / MAP_CLIP_RADIUS,
        clipRadius: MAP_CLIP_RADIUS,
        centerX,
        centerY,
        blur: 0,
        brightness: MAP_BRIGHTNESS,
      };
    case 'gen':
      return {
        scale: GENOME_SCALE,
        clipRadius: fullRadius,
        centerX,
        centerY,
        blur: GENOME_BLUR,
        brightness: GENOME_BRIGHTNESS,
      };
    case 'scene':
      return { scale: 1, clipRadius: fullRadius, centerX, centerY, blur: 0, brightness: 1 };
  }
}

export function worldCameraStyle(camera: WorldCamera): WorldCameraStyle {
  const center = `${camera.centerX}px ${camera.centerY}px`;
  return {
    transformOrigin: center,
    transform: `scale(${camera.scale})`,
    clipPath: `circle(${camera.clipRadius}px at ${center})`,
    filter: `blur(${camera.blur}px) brightness(${camera.brightness})`,
  };
}
