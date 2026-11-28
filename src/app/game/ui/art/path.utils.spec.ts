import {
  ciliaFringe,
  easeSplines,
  loopFrames,
  outlineSamples,
  radialOutline,
  smoothPath,
  smoothSegments,
  wander,
  wavePath,
} from './path.utils';

const SQUARE = [
  [4, 0],
  [0, -4],
  [-4, 0],
  [0, 4],
] as const;

function numbers(path: string): number[] {
  return (path.match(/-?\d*\.?\d+/g) ?? []).map(Number);
}

describe('loopFrames', () => {
  it('schließt die Schleife mit dem ersten Bild', () => {
    const frames = loopFrames(8, (phase) => phase.toFixed(3)).split(';');
    expect(frames).toHaveLength(9);
    expect(frames[8]).toBe(frames[0]);
    expect(frames[1]).not.toBe(frames[0]);
  });
});

describe('outlineSamples', () => {
  it('liefert Normalen nach außen, unabhängig vom Umlaufsinn', () => {
    for (const outline of [SQUARE, [...SQUARE].reverse()]) {
      const samples = outlineSamples(outline, 2);
      expect(samples).toHaveLength(8);
      for (const { point, normal } of samples) {
        expect(point[0] * normal[0] + point[1] * normal[1]).toBeGreaterThan(0);
      }
    }
  });

  it('richtet Wimpern ohne Ausschlag entlang der Normalen aus', () => {
    expect(ciliaFringe(outlineSamples(SQUARE, 1), 2, 0, 1, 0)).toBe(
      'M4.00 0.00l2.00 0.00M0.00 -4.00l0.00 -2.00M-4.00 0.00l-2.00 0.00M0.00 4.00l0.00 2.00',
    );
  });
});

describe('wavePath', () => {
  it('läuft ohne Ausschlag gerade in die Richtung', () => {
    const path = wavePath(
      { start: [1, 2], angle: Math.PI, length: 4, amplitude: 0, wavelength: 2, steps: 2 },
      1.3,
    );
    expect(path.startsWith('M1.00 2.00')).toBe(true);
    expect(path.endsWith('-3.00 2.00')).toBe(true);
    expect(numbers(path).filter((_, k) => k % 2 === 1)).toEqual(Array(7).fill(2));
  });
});

describe('radialOutline', () => {
  it('zeichnet mit konstantem Radius einen Kreis', () => {
    const path = radialOutline(4, () => 3, 0);
    expect(path.startsWith('M3.00 0.00')).toBe(true);
    const ends = path
      .split('C')
      .slice(1)
      .map((curve) => numbers(curve).slice(4, 6));
    expect(ends).toHaveLength(4);
    expect(ends.every(([x, y]) => Math.abs(Math.hypot(x, y) - 3) < 0.01)).toBe(true);
  });
});

describe('wander', () => {
  it('bleibt im Radius und kehrt zum Start zurück', () => {
    const { values, keySplines, points: raw } = wander(7, 1, 5);
    const points = values.split(';').map((p) => p.split(' ').map(Number));
    expect(points).toHaveLength(6);
    expect(points[5]).toEqual(points[0]);
    expect(points.every(([x, y]) => Math.hypot(x, y) <= 1.01)).toBe(true);
    expect(keySplines.split(';')).toHaveLength(5);
    expect(raw).toHaveLength(6);
    expect(raw[5]).toEqual(raw[0]);
  });
});

describe('smoothSegments', () => {
  it('liefert dieselben Kurven wie smoothPath', () => {
    const segments = smoothSegments(SQUARE);
    expect(segments).toHaveLength(4);
    expect(smoothPath(SQUARE).split('C')).toHaveLength(5);
    expect(segments[3][3]).toEqual(SQUARE[0]);
  });
});

describe('easeSplines', () => {
  it('wiederholt den Spline je Abschnitt', () => {
    expect(easeSplines(2)).toBe('.45 0 .55 1;.45 0 .55 1');
  });
});
