import { clamp01 } from './scene-agent-logic';

/** Auf mehr Geräte-Pixel wird nicht gerendert (TK §8.2). */
export const MAX_PIXEL_RATIO = 2;

/** Bei dieser kleineren Viewport-Seite zeichnet die Szene im Maßstab 1 (Mockup: `--ms` 700 px). */
export const SCENE_REFERENCE_SIZE = 700;
export const SCENE_MIN_SCALE = 0.5;

/** Kleinste Größe und Deckkraft der Nahrungsklumpen einer fast leeren Futterstelle. */
export const SITE_MIN_SCALE = 0.45;
export const SITE_MIN_OPACITY = 0.5;

export function scenePixelRatio(devicePixelRatio: number): number {
  return devicePixelRatio > 0 ? Math.min(devicePixelRatio, MAX_PIXEL_RATIO) : 1;
}

/** Maßstab der Szene: auf kleinen Viewports rücken Bahnen und Futterstelle zusammen. */
export function sceneScale(width: number, height: number): number {
  return Math.min(1, Math.max(SCENE_MIN_SCALE, Math.min(width, height) / SCENE_REFERENCE_SIZE));
}

/** Klumpen schrumpfen und verblassen mit dem Vorrat, bleiben aber erkennbar. */
export function siteAppearance(stockShare: number): {
  readonly scale: number;
  readonly opacity: number;
} {
  const share = clamp01(stockShare);
  return {
    scale: SITE_MIN_SCALE + (1 - SITE_MIN_SCALE) * share,
    opacity: SITE_MIN_OPACITY + (1 - SITE_MIN_OPACITY) * share,
  };
}

/** Langsames Pulsieren der Futterstelle (Mockup: ±4 %). */
export function sitePulse(nowMs: number): number {
  return 1 + Math.sin(nowMs / 900) * 0.04;
}
