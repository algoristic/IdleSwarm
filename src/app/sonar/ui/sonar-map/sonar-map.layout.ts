import {
  circleBox,
  HERE_RADIUS,
  hitAreaPaths,
  hitRadius,
  keepApart,
  type LabelRequest,
  MAP_CENTER,
  type MapBox,
  placeLabels,
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
const HERE_LABEL_GAP = 4;

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

export interface MapNodeLabelLayout {
  readonly x: number;
  readonly y: number;
  readonly anchor: 'start' | 'middle' | 'end';
  /** Grundlinie der DNA-Zeile; `null`, wenn sie keinen Platz hat oder es keine gibt. */
  readonly dnaY: number | null;
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
  /** Grundlinie der Beschriftung der eigenen Position, relativ zum Zentrum. */
  readonly hereLabelY: number;
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

  const rangeBox = textBox(map.labelX, map.range.labelY, texts.range.length, smallSize, 'start');
  const ringBoxes = map.rings.map((ring, i) =>
    ring.labeled
      ? textBox(map.labelX, ring.labelY, texts.rings[i]?.length ?? 0, smallSize, 'start')
      : null,
  );
  const shownRings = keepApart([rangeBox, ...ringBoxes.filter((box) => box !== null)]).slice(1);
  let next = 0;
  const ringLabels = ringBoxes.map((box) => (box === null ? false : (shownRings[next++] ?? false)));

  const hereLabelY = HERE_RADIUS + HERE_LABEL_GAP + 0.9 * smallSize;
  const obstacles: MapBox[] = [
    rangeBox,
    ...ringBoxes.filter((box, i): box is MapBox => box !== null && ringLabels[i]),
    circleBox(MAP_CENTER, MAP_CENTER, HERE_RADIUS),
    textBox(MAP_CENTER, MAP_CENTER + hereLabelY, texts.here.length, smallSize, 'middle'),
  ];

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
  const placements = placeLabels(
    requests.filter((request) => request.lines.length > 0),
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
    hereLabelY,
    nodes: map.nodes.map((_node, i) => {
      const placement = requests[i].lines.length > 0 ? placements[placed++] : null;
      return {
        zoom: `scale(${zoom})`,
        hitPath: hitPaths[i],
        label:
          placement === null
            ? null
            : {
                x: placement.dx,
                y: placement.dy,
                anchor: placement.anchor,
                dnaY: placement.lines > 1 ? placement.dy + placement.lineHeight : null,
              },
      };
    }),
  };
}
