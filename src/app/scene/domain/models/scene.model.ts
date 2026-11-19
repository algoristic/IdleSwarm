import type { UnitType } from '@app/swarm/domain/models/units.model';

/** Anzahl je Einheitentyp (ganze Zahlen); für Einheiten und für Sprites. */
export type UnitCounts = Readonly<Record<UnitType, number>>;

/**
 * Ein gezeichneter Agent der Szene; steht bei großem Schwarm für mehrere Einheiten. Alle Zeiten sind
 * monotone Zeit der Szene in Millisekunden, Längen in Szene-Pixeln (Maßstab 1, Mockup K2-K).
 */
export interface SceneAgent {
  readonly id: number;
  readonly kind: UnitType;
  /** Startwinkel (rad) zum Zeitpunkt 0. */
  readonly angle: number;
  /** Winkelgeschwindigkeit (rad je ms); Soldaten laufen andersherum. */
  readonly angularSpeed: number;
  /** Bahnradius; bei Drohnen der äußere Wendepunkt („zu Hause“ im Schwarm). */
  readonly radius: number;
  /** Versatz im Pendel der Drohnen (ms), damit nicht alle gleichzeitig wenden. */
  readonly phaseMs: number;
  readonly bornAtMs: number;
  /** Zeitpunkt, ab dem der Agent ausblendet; `null`, solange er bleibt. */
  readonly leftAtMs: number | null;
}

/** Agenten der Szene samt eigenem visuellem RNG (nicht der RNG des Spielstands). */
export interface SceneAgents {
  readonly agents: readonly SceneAgent[];
  readonly rngState: number;
  readonly nextId: number;
  /** Frühester Zeitpunkt, an dem ein ausblendender Agent ganz verschwunden ist; sonst `null`. */
  readonly pruneAtMs: number | null;
}

/** Lage eines Agenten relativ zur Futterstelle (Szene-Pixel, Maßstab 1). */
export interface AgentPose {
  readonly x: number;
  readonly y: number;
  /** Bewegungsrichtung (rad), für die Dreiecke der Soldaten. */
  readonly heading: number;
  /** Drohne trägt Nahrung (Rückweg zum Schwarm). */
  readonly loaded: boolean;
  /** Deckkraft für sanftes Ein- und Ausblenden (0 bis 1). */
  readonly opacity: number;
}

/** Schwebeteilchen im Hintergrund; `x`, `y` als Anteil am Viewport. */
export interface Plankton {
  readonly x: number;
  readonly y: number;
  /** Tiefe 0,3 bis 1,5: Größe, Deckkraft und Steiggeschwindigkeit. */
  readonly depth: number;
  /** Steiggeschwindigkeit (Viewport-Anteil je ms bei Tiefe 1). */
  readonly speed: number;
  /** Index in der Farbliste des Renderers. */
  readonly color: number;
  readonly star: boolean;
}

/** Teilchen (Ertrag, Blasen) relativ zur Futterstelle (Szene-Pixel, Maßstab 1). */
export interface SceneParticle {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly opacity: number;
}

/** Alles, was der Renderer je Frame braucht; die Facade leitet es aus Zustand und Viewport ab. */
export interface SceneFrame {
  /** Viewport in CSS-Pixeln. */
  readonly width: number;
  readonly height: number;
  /** Geräte-Pixelverhältnis, auf `MAX_PIXEL_RATIO` gedeckelt. */
  readonly pixelRatio: number;
  /** Sprites je Typ nach Budget. */
  readonly sprites: UnitCounts;
  /** Der Schwarm ist unterwegs (kein Standort). */
  readonly traveling: boolean;
  /** Vorratsanteil der Futterstelle (0 bis 1). */
  readonly stockShare: number;
  /** Ertragsteilchen je Sekunde (gedeckelt). */
  readonly yieldParticleRate: number;
  /** Hook für „Partikel reduzieren“ (Einstellung ab AP 1.4.6). */
  readonly reduceParticles: boolean;
}
