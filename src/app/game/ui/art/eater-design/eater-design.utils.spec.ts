import { amoebaOutline, outlineFrames, wander } from './eater-design.utils';

const RESTING =
  'M10.00 -0.50C10.00 1.20 8.00 1.60 6.00 2.00C4.50 2.40 4.00 3.40 3.50 5.50C3.20 7.00 1.20 7.20 0.60 5.60C0.00 4.20 -1.50 4.00 -3.50 4.20C-7.00 4.60 -9.50 3.00 -9.30 0.40C-9.00 -2.20 -7.00 -3.00 -6.50 -5.00C-6.00 -7.00 -3.50 -7.20 -2.80 -5.40C-2.20 -4.00 0.00 -3.80 2.50 -3.40C5.00 -3.00 6.50 -2.40 8.00 -2.20C9.40 -2.00 10.00 -1.50 10.00 -0.50Z';

describe('amoebaOutline', () => {
  it('zeichnet ohne Ausschlag den ruhenden Umriss', () => {
    expect(amoebaOutline(1.3, 0)).toBe(RESTING);
  });

  it('schließt die Wellenschleife mit dem ersten Bild', () => {
    const frames = outlineFrames(8, (phase) => amoebaOutline(phase, 0.4)).split(';');
    expect(frames).toHaveLength(9);
    expect(frames[8]).toBe(frames[0]);
    expect(frames[1]).not.toBe(frames[0]);
  });
});

describe('wander', () => {
  it('bleibt im Radius und kehrt zum Start zurück', () => {
    const { values, keySplines } = wander(7, 1, 5);
    const points = values.split(';').map((p) => p.split(' ').map(Number));
    expect(points).toHaveLength(6);
    expect(points[5]).toEqual(points[0]);
    expect(points.every(([x, y]) => Math.hypot(x, y) <= 1.01)).toBe(true);
    expect(keySplines.split(';')).toHaveLength(5);
  });
});
