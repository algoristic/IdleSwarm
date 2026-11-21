import {
  clearOf,
  HERE_RADIUS,
  hitAreaPaths,
  hitRadius,
  keepApart,
  type LabelPlacement,
  type LabelRequest,
  MAP_CENTER,
  type MapBox,
  placeLabels,
  requestDisc,
  ringLabelBaseline,
  symbolZoom,
  textBox,
  textSize,
} from '../../domain/sonar-map-logic';
import type { SonarMapView } from './sonar-map.component.model';

/** Schriftgrößen der Karte im Mockup (`viewBox`-Einheiten): Namen `text-base`, sonst `text-sm`. */
const NAME_SIZE = 16;
const SMALL_SIZE = 14;
/** Platz, den ein Ziel samt Halo um seinen Radius belegt, und Höhe der ◆-Markierung darüber. */
const NODE_CLEARANCE = 8;
const MARK_CLEARANCE = 32;
/** Die eigene Position wird vor allen Zielen beschriftet; die Ziele weichen ihr aus. */
const HERE_PRIORITY = -1;

/** Texte der Karte, die der Platzbedarf braucht; die Komponente setzt sie aus `$localize` zusammen. */
export interface SonarMapTexts {
  /** Name je Ziel; `null` für unerforschte (nur „?“). */
  readonly names: readonly (string | null)[];
  /** DNA-Zeile je Ziel; `null` ohne DNA-Belohnung. */
  readonly dna: readonly (string | null)[];
  /** Ringnummern in der Reihenfolge von `SonarMapView.rings`. */
  readonly rings: readonly string[];
  readonly range: string;
  readonly here: string;
}

export interface MapNodeLabelLayout extends MapLabelLayout {
  /** Grundlinie der DNA-Zeile; `null`, wenn sie keinen Platz hat oder es keine gibt. */
  readonly dnaY: number | null;
}

/** Beschriftung relativ zu ihrem Punkt (Ziel oder eigene Position im Zentrum). */
export interface MapLabelLayout {
  readonly x: number;
  readonly y: number;
  readonly anchor: 'start' | 'middle' | 'end';
}

export interface MapNodeLayout {
  /** `scale(f)` der Zielsymbole: auf kleinen Karten etwas größer. */
  readonly zoom: string;
  /** Unsichtbare Trefferfläche relativ zum Ziel; `null`, wenn ein anderes Ziel genau darüber liegt. */
  readonly hitPath: string | null;
  /** `null`: Beschriftung entfällt aus Platzmangel (Name steht im `aria-label` und im Detailpanel). */
  readonly label: MapNodeLabelLayout | null;
}

/** Was von der gerenderten Größe der Karte abhängt: Schrift, Symbole, Trefferflächen, Beschriftung. */
export interface SonarMapLayout {
  readonly nameSize: number;
  readonly smallSize: number;
  readonly nodes: readonly MapNodeLayout[];
  /** Je Ring: Nummer sichtbar (nicht bei der Reichweite und nicht zu dicht an einer anderen). */
  readonly ringLabels: readonly boolean[];
  /** Grundlinie je Ringnummer (unter dem Ring, `ringLabelBaseline`). */
  readonly ringLabelYs: readonly number[];
  /** Grundlinie der Beschriftung der Reichweite. */
  readonly rangeLabelY: number;
  /** Beschriftung der eigenen Position relativ zum Zentrum; weicht Zielen und Beschriftungen aus. */
  readonly hereLabel: MapLabelLayout;
}

/**
 * Passt die Karte an ihre gerenderte Größe an (`pixelScale` = Pixel je `viewBox`-Einheit): Schrift
 * mindestens 12 px, Trefferflächen mindestens 44 px ohne Überschneidung, Beschriftungen ohne
 * Überlappung (sonst kürzer oder ausgeblendet; das gewählte Ziel behält seinen Namen).
 */
export function layoutSonarMap(
  map: SonarMapView,
  pixelScale: number,
  texts: SonarMapTexts,
): SonarMapLayout {
  const nameSize = textSize(NAME_SIZE, pixelScale);
  const smallSize = textSize(SMALL_SIZE, pixelScale);
  const zoom = symbolZoom(pixelScale);

  const rangeLabelY = ringLabelBaseline(map.range.radius, smallSize);
  const ringLabelYs = map.rings.map((ring) => ringLabelBaseline(ring.radius, smallSize));
  const rangeBox = textBox(map.labelX, rangeLabelY, texts.range.length, smallSize, 'start');
  const ringBoxes = map.rings.map((ring, i) =>
    ring.labeled
      ? textBox(map.labelX, ringLabelYs[i], texts.rings[i]?.length ?? 0, smallSize, 'start')
      : null,
  );

  // Die eigene Position belegt ihren Kreis und bekommt zuerst eine freie Seite (bevorzugt unten).
  const hereRequest: LabelRequest = {
    x: MAP_CENTER,
    y: MAP_CENTER,
    clearance: HERE_RADIUS,
    clearanceTop: 0,
    lines: [texts.here.length],
    priority: HERE_PRIORITY,
    required: true,
    fontSize: smallSize,
  };
  const requests: LabelRequest[] = map.nodes.map((node, i) => {
    const name = texts.names[i];
    const dna = texts.dna[i];
    return {
      x: node.x,
      y: node.y,
      clearance: (node.radius + NODE_CLEARANCE) * zoom,
      clearanceTop: node.target.strategyChoice ? (node.radius + MARK_CLEARANCE) * zoom : 0,
      lines: name === null ? [] : dna === null ? [name.length] : [name.length, dna.length],
      priority: node.target.selected ? 0 : node.target.strategyChoice ? 1 : node.dimmed ? 3 : 2,
      required: node.target.selected,
    };
  });
  // Ringnummern fallen weg, wo sie einander, der Reichweite, einem Ziel oder der eigenen Position
  // im Weg stünden; die Reichweite bleibt immer stehen.
  const discs = [hereRequest, ...requests].map(requestDisc);
  const shownRings = keepApart([rangeBox, ...ringBoxes.filter((box) => box !== null)]).slice(1);
  let next = 0;
  const ringLabels = ringBoxes.map((box) =>
    box === null ? false : (shownRings[next++] ?? false) && clearOf(box, discs),
  );
  const obstacles: MapBox[] = [
    rangeBox,
    ...ringBoxes.filter((box, i): box is MapBox => box !== null && ringLabels[i]),
  ];
  const [herePlacement, ...placements] = placeLabels(
    [hereRequest, ...requests.filter((request) => request.lines.length > 0)],
    obstacles,
    nameSize,
  );
  let placed = 0;
  const hitPaths = hitAreaPaths(
    map.nodes.map((node) => ({
      x: node.x,
      y: node.y,
      radius: hitRadius(node.focusRadius * zoom, pixelScale),
    })),
  );

  return {
    nameSize,
    smallSize,
    ringLabels,
    ringLabelYs,
    rangeLabelY,
    hereLabel: toLabel(herePlacement),
    nodes: map.nodes.map((_node, i) => {
      const placement = requests[i].lines.length > 0 ? placements[placed++] : null;
      return {
        zoom: `scale(${zoom})`,
        hitPath: hitPaths[i],
        label:
          placement === null
            ? null
            : {
                ...toLabel(placement),
                dnaY: placement.lines > 1 ? placement.dy + placement.lineHeight : null,
              },
      };
    }),
  };
}

/** `required` garantiert eine Platzierung; der Rückfall hält den Typ ohne Assertion ehrlich. */
function toLabel(placement: LabelPlacement | null | undefined): MapLabelLayout {
  return placement
    ? { x: placement.dx, y: placement.dy, anchor: placement.anchor }
    : { x: 0, y: 0, anchor: 'middle' };
}
