import type { WorldCameraStyle } from '../../domain/models/shell-mode.model';

/** Was die Shell aus Modus und Viewport für Ebenen und Kamera bindet. */
export interface ShellLayoutView {
  /** Kantenlänge von Sonar-Karte und Genom als CSS-Wert für `--ms`. */
  readonly stageSize: string;
  readonly world: WorldCameraStyle;
}
