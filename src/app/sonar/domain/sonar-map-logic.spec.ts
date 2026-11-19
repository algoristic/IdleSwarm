import { Num } from '@app/shared/util/num/num';

import {
  approachPath,
  arcDash,
  CHAR_WIDTH_EM,
  HERE_RADIUS,
  hitAreaPaths,
  hitRadius,
  keepApart,
  type LabelRequest,
  MIN_HIT_PX,
  MIN_TEXT_PX,
  placeLabels,
  SYMBOL_ZOOM_MAX,
  symbolZoom,
  textBox,
  textSize,
  MAP_CENTER,
  MAP_RADIUS,
  mapScale,
  NODE_RADIUS_MAX,
  NODE_RADIUS_MIN,
  nodeRadii,
  toMapPoint,
  trail,
  travelLine,
} from './sonar-map-logic';

describe('mapScale', () => {
  it('rundet die größte Distanz auf ganze Ringe auf', () => {
    expect(mapScale(5, [2, 6.3])).toEqual({ rings: 7, unit: MAP_RADIUS / 7 });
  });

  it('nimmt mindestens die Reichweite und ignoriert Gleitkomma-Reste', () => {
    expect(mapScale(5, [1, 2]).rings).toBe(5);
    expect(mapScale(5, [5.0000000001]).rings).toBe(5);
    expect(mapScale(0, []).rings).toBe(1);
  });
});

describe('toMapPoint', () => {
  it('rechnet relativ zur eigenen Position', () => {
    expect(toMapPoint({ x: 13, y: 8 }, { x: 10, y: 10 }, 50)).toEqual({
      x: MAP_CENTER + 150,
      y: MAP_CENTER - 100,
    });
  });
});

describe('trail', () => {
  const unit = MAP_RADIUS / 5;

  it('führt durch die besuchten Stellen bis zur eigenen Position', () => {
    const result = trail(
      [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
      ],
      { x: 2, y: 0 },
      unit,
    );
    expect(result.points).toEqual([{ x: MAP_CENTER - 2 * unit, y: MAP_CENTER }]);
    expect(result.path).toBe(`M${MAP_CENTER - 2 * unit} 400 L400 400`);
  });

  it('schneidet am Rand ab und lässt ältere Stellen weg', () => {
    const result = trail(
      [
        { x: -20, y: 3 },
        { x: -10, y: 0 },
        { x: -3, y: 0 },
        { x: 0, y: 0 },
      ],
      { x: 0, y: 0 },
      unit,
    );
    expect(result.points).toEqual([{ x: MAP_CENTER - 3 * unit, y: MAP_CENTER }]);
    expect(result.path).toBe(
      `M${MAP_CENTER - MAP_RADIUS} 400 L${MAP_CENTER - 3 * unit} 400 L400 400`,
    );
  });

  it('hat ohne frühere Stellen keinen Pfad', () => {
    expect(trail([{ x: 1, y: 1 }], { x: 1, y: 1 }, unit)).toEqual({ path: null, points: [] });
  });
});

describe('approachPath und travelLine', () => {
  const target = { x: MAP_CENTER + 200, y: MAP_CENTER };

  it('beginnt am Rand der eigenen Position', () => {
    expect(approachPath(target)).toMatch(new RegExp(`^M${MAP_CENTER + HERE_RADIUS} 400 Q`));
    expect(approachPath({ x: MAP_CENTER, y: MAP_CENTER })).toBeNull();
  });

  it('setzt den Schwarm nach dem Fortschritt auf die Linie', () => {
    const travel = travelLine(target, 0.5);
    expect(travel?.path).toBe(`M${MAP_CENTER + HERE_RADIUS} 400 L600 400`);
    expect(travel?.swarm).toEqual({ x: MAP_CENTER + HERE_RADIUS + 85, y: MAP_CENTER });
    expect(travelLine(target, 2)?.swarm).toEqual(target);
  });
});

describe('nodeRadii', () => {
  it('skaliert logarithmisch zwischen kleinstem und größtem Vorrat', () => {
    const radii = nodeRadii([Num.from(1_000), Num.from(100_000), Num.from(10_000), null]);
    expect(radii[0]).toBe(NODE_RADIUS_MIN);
    expect(radii[1]).toBe(NODE_RADIUS_MAX);
    expect(radii[2]).toBeCloseTo((NODE_RADIUS_MIN + NODE_RADIUS_MAX) / 2, 0);
    expect(radii[3]).toBe(NODE_RADIUS_MIN);
  });
});

describe('arcDash', () => {
  it('zeichnet den Anteil am Kreis, ohne Anteil keinen Bogen', () => {
    const circumference = Math.round(2 * Math.PI * 10 * 10) / 10;
    expect(arcDash(10, 1)).toBe(`${circumference} ${circumference}`);
    expect(arcDash(10, 0)).toBeNull();
  });
});

describe('Mindestgrößen auf dem Bildschirm', () => {
  it('vergrößert Schrift im viewBox, bis sie mindestens 12 px groß gerendert wird', () => {
    expect(textSize(16, 1.2)).toBe(16);
    expect(textSize(16, 0.45) * 0.45).toBeCloseTo(MIN_TEXT_PX, 1);
    expect(textSize(14, 0)).toBe(14);
  });

  it('vergrößert die Ziele nur auf kleinen Karten und höchstens bis zum Grenzwert', () => {
    expect(symbolZoom(1)).toBe(1);
    expect(symbolZoom(0.6)).toBe(1);
    expect(symbolZoom(0.45)).toBeCloseTo(1.33, 2);
    expect(symbolZoom(0.1)).toBe(SYMBOL_ZOOM_MAX);
  });

  it('macht Trefferflächen mindestens 44 px breit', () => {
    expect(hitRadius(30, 1)).toBe(30);
    expect(hitRadius(30, 0.45) * 2 * 0.45).toBeCloseTo(MIN_HIT_PX, 0);
  });
});

/** Eckpunkte eines Pfads `M… L… Z` relativ zum Mittelpunkt. */
function pathPoints(path: string): { x: number; y: number }[] {
  return [...path.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  }));
}

describe('hitAreaPaths', () => {
  it('lässt einzelne Ziele als vollen Kreis', () => {
    expect(hitAreaPaths([{ x: 100, y: 100, radius: 40 }])).toEqual([
      'M-40 0 A40 40 0 1 0 40 0 A40 40 0 1 0 -40 0 Z',
    ]);
  });

  it('teilt überlappende Flächen an der Mittelsenkrechten (näheres Zentrum gewinnt)', () => {
    const [left, right] = hitAreaPaths([
      { x: 100, y: 100, radius: 50 },
      { x: 160, y: 100, radius: 50 },
    ]);
    const leftPoints = pathPoints(left ?? '');
    const rightPoints = pathPoints(right ?? '');
    // Die linke Fläche reicht bis zur Mitte (x = 30 relativ), die rechte ab dort nach links.
    expect(Math.max(...leftPoints.map((p) => p.x))).toBeCloseTo(30, 1);
    expect(Math.min(...rightPoints.map((p) => p.x))).toBeCloseTo(-30, 1);
    expect(Math.min(...leftPoints.map((p) => p.x))).toBeCloseTo(-50, 1);
  });

  it('gibt bei genau übereinanderliegenden Zielen dem früheren die Fläche', () => {
    const paths = hitAreaPaths([
      { x: 100, y: 100, radius: 40 },
      { x: 100, y: 100, radius: 40 },
    ]);
    expect(paths[0]).not.toBeNull();
    expect(paths[1]).toBeNull();
  });
});

describe('placeLabels', () => {
  const request = (x: number, y: number, extra: Partial<LabelRequest> = {}): LabelRequest => ({
    x,
    y,
    clearance: 20,
    clearanceTop: 0,
    lines: [10, 6],
    priority: 2,
    required: false,
    ...extra,
  });

  it('setzt eine freie Beschriftung unter das Ziel', () => {
    const [placement] = placeLabels([request(400, 300)], [], 16);
    expect(placement).toMatchObject({ side: 'below', anchor: 'middle', dx: 0, lines: 2 });
    expect(placement?.dy).toBeGreaterThan(20);
  });

  it('weicht bei nahen Zielen auf eine andere Seite aus', () => {
    const placements = placeLabels([request(400, 300), request(410, 340)], [], 16);
    // Unter dem ersten liegt das zweite Ziel; also oben, das zweite bekommt den Platz unten.
    expect(placements.map((placement) => placement?.side)).toEqual(['above', 'below']);
  });

  it('platziert nach Priorität; bei Platzmangel nur der Name oder gar nichts', () => {
    // Zwei Ziele fast an derselben Stelle, Hindernisse ringsum außer direkt unter dem ersten.
    const obstacles = [
      { left: 0, top: 0, right: 800, bottom: 270 },
      { left: 0, top: 0, right: 370, bottom: 800 },
      { left: 430, top: 0, right: 800, bottom: 800 },
      { left: 0, top: 345, right: 800, bottom: 800 },
    ];
    const placements = placeLabels(
      [request(400, 300), request(402, 302, { priority: 0, required: true })],
      obstacles,
      16,
    );
    // Das gewählte Ziel (Priorität 0) bekommt den Platz zuerst, nur mit einer Zeile.
    expect(placements[1]).toMatchObject({ side: 'below', lines: 1 });
    expect(placements[0]).toBeNull();
  });

  it('hält Beschriftungen im viewBox', () => {
    const [placement] = placeLabels([request(400, 790)], [], 16);
    expect(placement?.side).toBe('above');
  });
});

describe('textBox und keepApart', () => {
  it('schätzt die Breite aus der Zeichenzahl', () => {
    const box = textBox(100, 50, 10, 20, 'start');
    expect(box.left).toBe(100);
    expect(box.right).toBeCloseTo(100 + 10 * CHAR_WIDTH_EM * 20);
    expect(textBox(100, 50, 10, 20, 'end').right).toBe(100);
  });

  it('behält in Reihenfolge nur Beschriftungen, die keine behaltene berühren', () => {
    const a = textBox(400, 100, 4, 20, 'start');
    const b = textBox(400, 110, 4, 20, 'start');
    const c = textBox(400, 200, 4, 20, 'start');
    expect(keepApart([a, b, c])).toEqual([true, false, true]);
  });
});
