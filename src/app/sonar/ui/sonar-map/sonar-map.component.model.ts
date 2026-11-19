import type { SiteTypeId } from '@app/site/domain/data/sites-era1.data';

import type { MapSpoke, MapTravel, MapTrail } from '../../domain/sonar-map-logic';
import type { TargetView } from '../models/target.model';

export interface MapRingView {
  /** Distanz des Rings, ganzzahlig. */
  readonly distance: number;
  readonly radius: number;
  readonly labelY: number;
  /** Ringnummer fällt weg, wo die Reichweite beschriftet ist. */
  readonly labeled: boolean;
}

/** Ziel auf der Karte; alle Maße im `viewBox`, die Gruppe liegt bei `translate`. */
export interface MapNodeView {
  readonly target: TargetView;
  /** Mittelpunkt im `viewBox`. */
  readonly x: number;
  readonly y: number;
  /** `translate(x y)` der Gruppe. */
  readonly translate: string;
  readonly radius: number;
  /** `scale(r)`: Die Kugel ist im Template für den Einheitskreis gezeichnet. */
  readonly ballScale: string;
  readonly haloRadius: number;
  readonly selectionRadius: number;
  /** Fokusring und Trefferfläche. */
  readonly focusRadius: number;
  /** `stroke-dasharray` des Abwehrbogens; `null` ohne Abwehr oder unerforscht. */
  readonly defenseDash: string | null;
  readonly markY: number;
  /** Außer Reichweite, unerforscht oder Ziel vom alten Standort während der Reise. */
  readonly dimmed: boolean;
}

export interface MapHereView {
  readonly type: SiteTypeId;
  /** `translate(x y)` des Zentrums. */
  readonly translate: string;
  readonly radius: number;
}

export interface SonarMapView {
  readonly viewBox: string;
  readonly center: number;
  readonly outerRadius: number;
  /** x der Ringbeschriftung, knapp rechts der senkrechten Achse. */
  readonly labelX: number;
  /** Von außen nach innen: Die Tiefenscheiben stapeln sich zur Mitte heller. */
  readonly rings: readonly MapRingView[];
  readonly spokes: readonly MapSpoke[];
  readonly sweep: string;
  readonly range: { readonly value: number; readonly radius: number; readonly labelY: number };
  readonly trail: MapTrail;
  readonly nodes: readonly MapNodeView[];
  /** Route zum gewählten Ziel in Reichweite; `null` ohne Auswahl, außer Reichweite oder unterwegs. */
  readonly route: string | null;
  readonly travel: MapTravel | null;
  /** Eigene Position; während der Reise der verlassene Standort. */
  readonly here: MapHereView;
}
