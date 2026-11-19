import { Num } from '@app/shared/util/num/num';

import {
  approachPath,
  arcDash,
  HERE_RADIUS,
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
