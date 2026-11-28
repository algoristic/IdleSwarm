import { worldLight } from './figure.utils';
import {
  PARAMECIUM_TIMING,
  PARAMECIUM_VARIANT_COUNT,
  PARAMECIUM_VARIANTS,
  parameciumPhaseOffset,
  parameciumSwim,
  parameciumVariantFor,
  SwimArea,
} from './paramecium.utils';

const GLOW = 2;

function coordinates(path: string): number[] {
  return (path.match(/-?\d*\.?\d+/g) ?? []).map(Number);
}

function ends(path: string): [number, number][] {
  return [...path.matchAll(/M(-?[\d.]+) (-?[\d.]+)l(-?[\d.]+) (-?[\d.]+)/g)].map(
    ([, x, y, dx, dy]): [number, number] => [+x + +dx, +y + +dy],
  );
}

describe('PARAMECIUM_VARIANTS', () => {
  it('hat fünf verschiedene Varianten', () => {
    expect(PARAMECIUM_VARIANTS).toHaveLength(PARAMECIUM_VARIANT_COUNT);
    expect(new Set(PARAMECIUM_VARIANTS.map((v) => v.body)).size).toBe(PARAMECIUM_VARIANT_COUNT);
  });

  it('bleibt mit Leuchtsaum und Wimpern in der Box ±12', () => {
    for (const variant of PARAMECIUM_VARIANTS) {
      for (let k = 0; k < 12; k++) {
        for (const [x, y] of variant.outline((k / 12) * Math.PI * 2)) {
          expect(Math.max(Math.abs(x), Math.abs(y)) + GLOW).toBeLessThanOrEqual(12);
        }
      }
      for (const frame of variant.ciliaFrames.split(';')) {
        for (const [x, y] of ends(frame)) {
          expect(Math.max(Math.abs(x), Math.abs(y))).toBeLessThanOrEqual(12);
        }
      }
    }
  });

  it('ist ein schlanker Pantoffel mit dem Vorderende bei +x', () => {
    for (const variant of PARAMECIUM_VARIANTS) {
      const outline = variant.outline(0);
      const xs = outline.map(([x]) => x);
      const ys = outline.map(([, y]) => y);
      const length = Math.max(...xs) - Math.min(...xs);
      const width = Math.max(...ys) - Math.min(...ys);
      expect(length / width).toBeGreaterThan(2);
      expect(Math.max(...xs)).toBeGreaterThan(8);
    }
  });

  it('lässt die Wimpern im Takt schlagen und behält dieselben Befehle je Bild', () => {
    for (const variant of PARAMECIUM_VARIANTS) {
      const frames = variant.ciliaFrames.split(';');
      expect(frames).toHaveLength(25);
      expect(frames[24]).toBe(frames[0]);
      expect(frames[4]).not.toBe(frames[0]);
      expect(frames[8]).not.toBe(frames[0]);
      expect(new Set(frames.map((f) => f.replace(/[^Ml]/g, ''))).size).toBe(1);
      expect(variant.ciliaPath).toBe(frames[0]);
    }
  });

  it('wellt den Saum leicht an den Flanken nach hinten, die Enden bleiben', () => {
    for (const variant of PARAMECIUM_VARIANTS) {
      const frames = variant.bodyFrames.split(';');
      expect(frames).toHaveLength(13);
      expect(frames[12]).toBe(frames[0]);
      expect(variant.body).toBe(frames[0]);
      const rest = variant.outline(0);
      const step = variant.outline(0.3);
      const shifts = rest.map(([x, y], i) => Math.hypot(step[i][0] - x, step[i][1] - y));
      expect(Math.max(...shifts)).toBeGreaterThan(0.01);
      for (let k = 0; k < 12; k++) {
        variant.outline((k / 12) * Math.PI * 2).forEach(([x, y], i) => {
          expect(Math.hypot(x - rest[i][0], y - rest[i][1])).toBeLessThanOrEqual(0.44 + 1e-9);
        });
      }
      expect(shifts[0]).toBeLessThan(1e-9);
      expect(shifts[14]).toBeLessThan(1e-9);
      const frameCount = 12;
      const shapes = Array.from({ length: frameCount }, (_, k) =>
        variant.outline((k / frameCount) * Math.PI * 2),
      );
      const mean = rest.map((_, i) => shapes.reduce((sum, o) => sum + o[i][1], 0) / frameCount);
      const lift = (phase: number, i: number): number => variant.outline(phase)[i][1] - mean[i];
      let travel = 0;
      for (let i = 2; i < 13; i++) {
        travel += (lift(0.05, i) - lift(0, i)) * (lift(0, i + 1) - lift(0, i - 1));
      }
      expect(travel).toBeLessThan(0);
    }
  });

  it('neigt die Wimpern nach hinten', () => {
    for (const variant of PARAMECIUM_VARIANTS) {
      const lines = variant.cilia(0, 0);
      const rearward = lines.filter(([, [dx]]) => dx < 0).length;
      expect(rearward / lines.length).toBeGreaterThan(0.7);
    }
  });

  it('führt Nahrung auf der Zyklose im Kreis und verteilt sie', () => {
    for (const variant of PARAMECIUM_VARIANTS) {
      const { values } = variant.cyclosisX;
      expect(values[values.length - 1]).toBe(values[0]);
      expect(variant.foods.length).toBeGreaterThanOrEqual(3);
      expect(variant.foods.length).toBeLessThanOrEqual(5);
      expect(new Set(variant.foods.map((f) => f.delay)).size).toBe(variant.foods.length);
      expect(coordinates(variant.cyclosisValues)).toHaveLength(2 * values.length);
    }
  });
});

describe('Figuren', () => {
  it('ordnet jedem Index fest eine Variante und einen Versatz zu', () => {
    const variants = Array.from({ length: 48 }, (_, i) => parameciumVariantFor(i));
    expect(new Set(variants)).toEqual(new Set([0, 1, 2, 3, 4]));
    for (let i = 0; i < 48; i++) {
      expect(parameciumPhaseOffset(i)).toBeGreaterThanOrEqual(0);
      expect(parameciumPhaseOffset(i)).toBeLessThan(PARAMECIUM_TIMING.cyclosis);
    }
  });
});

describe('parameciumSwim', () => {
  const SPEED = 11;
  const areaFor = (i: number): SwimArea => {
    const angle = i * 2.39996;
    return {
      start: [Math.cos(angle) * 100, Math.sin(angle) * 100],
      inner: 50,
      outer: 170,
      speed: SPEED,
    };
  };
  const swims = Array.from({ length: 12 }, (_, i) => parameciumSwim(i, areaFor(i)));

  it('bleibt im Ring um die Schwarmmitte', () => {
    swims.forEach(({ x, y }, i) => {
      const [sx, sy] = areaFor(i).start;
      x.values.forEach((value, k) => {
        const distance = Math.hypot(sx + value, sy + y.values[k]);
        expect(distance).toBeGreaterThan(50 - 1e-6);
        expect(distance).toBeLessThan(170 + 1e-6);
      });
    });
  });

  it('schwimmt auf einer geschlossenen Bahn ab dem Platz', () => {
    for (const { x, y, rotation, path } of swims) {
      expect([x.values[0], y.values[0]]).toEqual([0, 0]);
      expect([x.values.at(-1), y.values.at(-1)]).toEqual([0, 0]);
      expect(path.startsWith('M0.00 0.00C')).toBe(true);
      expect(path.endsWith('Z')).toBe(true);
      const turn = (rotation.values.at(-1) ?? 0) - rotation.values[0];
      expect(Math.abs(turn / 360 - Math.round(turn / 360))).toBeLessThan(1e-9);
    }
  });

  it('gleitet ohne Haken, jede Figur in eigenem Tempo', () => {
    const paces = swims.map(({ x, y, rotation, duration }) => {
      let length = 0;
      for (let k = 1; k < x.values.length; k++) {
        length += Math.hypot(x.values[k] - x.values[k - 1], y.values[k] - y.values[k - 1]);
        expect(Math.abs(rotation.values[k] - rotation.values[k - 1])).toBeLessThan(30);
      }
      expect(length / duration).toBeGreaterThan(0.6 * SPEED);
      expect(length / duration).toBeLessThan(1.6 * SPEED);
      return length / duration;
    });
    expect(Math.max(...paces) / Math.min(...paces)).toBeGreaterThan(1.2);
  });

  it('zeigt mit dem Vorderende entlang der Bahn, auch beim Zurücksetzen', () => {
    for (const { x, y, rotation } of swims) {
      for (let k = 1; k < x.values.length - 1; k++) {
        const dx = x.values[k + 1] - x.values[k - 1];
        const dy = y.values[k + 1] - y.values[k - 1];
        if (Math.hypot(dx, dy) < 1) continue;
        const heading = Math.atan2(dy, dx);
        const along = Math.cos(heading - (rotation.values[k] * Math.PI) / 180);
        expect(Math.abs(along)).toBeGreaterThan(0.98);
      }
    }
  });

  it('setzt ein- bis zweimal je Runde kurz zurück', () => {
    for (const { keyPoints, keyTimes } of swims) {
      const points = keyPoints.split(';').map(Number);
      const times = keyTimes.split(';').map(Number);
      expect(points[0]).toBe(0);
      expect(points.at(-1)).toBe(1);
      expect(times[0]).toBe(0);
      expect(times.at(-1)).toBe(1);
      expect(times).toHaveLength(points.length);
      const runs: number[] = [];
      let run = 0;
      for (let k = 1; k < points.length; k++) {
        expect(points[k]).toBeGreaterThanOrEqual(0);
        expect(points[k]).toBeLessThanOrEqual(1);
        expect(times[k]).toBeGreaterThan(times[k - 1]);
        const step = points[k] - points[k - 1];
        if (step < 0 || (run > 0 && step === 0)) run -= step;
        else if (run > 0) {
          runs.push(run);
          run = 0;
        }
      }
      expect(runs.length).toBeGreaterThanOrEqual(1);
      expect(runs.length).toBeLessThanOrEqual(2);
      runs.forEach((share) => expect(share).toBeLessThan(0.05));
    }
  });

  it('hält das Licht gegen die Drehung oben links', () => {
    for (const swim of swims) {
      const lights = swim.lightValues.split(';');
      expect(lights).toHaveLength(swim.keyTimes.split(';').length);
      lights.forEach((value, k) => {
        const [lx, ly] = worldLight(swim.rotation.values[k]);
        const [vx, vy] = value.split(' ').map(Number);
        expect(vx).toBeCloseTo(lx, 1);
        expect(vy).toBeCloseTo(ly, 1);
      });
    }
  });

  it('ist je Index stabil und verschieden', () => {
    expect(parameciumSwim(3, areaFor(3))).toEqual(swims[3]);
    expect(new Set(swims.map((s) => s.path)).size).toBe(swims.length);
  });
});
