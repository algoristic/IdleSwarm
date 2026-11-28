import { keyframeValue } from '../keyframes.utils';
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
      for (const [x, y] of variant.outline) {
        expect(Math.max(Math.abs(x), Math.abs(y)) + GLOW).toBeLessThanOrEqual(12);
      }
      for (const frame of variant.ciliaFrames.split(';')) {
        for (const [x, y] of ends(frame)) {
          expect(Math.max(Math.abs(x), Math.abs(y))).toBeLessThanOrEqual(12);
        }
      }
    }
  });

  it('ist ein schlanker Pantoffel mit dem Vorderende bei +x', () => {
    for (const { outline } of PARAMECIUM_VARIANTS) {
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
      expect(frames).toHaveLength(9);
      expect(frames[8]).toBe(frames[0]);
      expect(frames[4]).not.toBe(frames[0]);
      expect(new Set(frames.map((f) => f.replace(/[^Ml]/g, ''))).size).toBe(1);
      expect(variant.ciliaPath).toBe(frames[0]);
    }
  });

  it('neigt die Wimpern nach hinten', () => {
    for (const variant of PARAMECIUM_VARIANTS) {
      const lines = variant.cilia(0);
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

  it('gleitet ohne Haken und braucht so lange, wie die Bahn lang ist', () => {
    for (const { x, y, rotation, duration } of swims) {
      let length = 0;
      for (let k = 1; k < x.values.length; k++) {
        length += Math.hypot(x.values[k] - x.values[k - 1], y.values[k] - y.values[k - 1]);
        expect(Math.abs(rotation.values[k] - rotation.values[k - 1])).toBeLessThan(25);
      }
      expect(Math.abs(duration - length / SPEED) / duration).toBeLessThan(0.1);
    }
  });

  it('zeigt mit dem Vorderende entlang der Bahn', () => {
    for (const { x, y, rotation } of swims) {
      for (let k = 1; k < x.values.length - 1; k++) {
        const heading = Math.atan2(
          y.values[k + 1] - y.values[k - 1],
          x.values[k + 1] - x.values[k - 1],
        );
        expect(Math.cos(heading - (rotation.values[k] * Math.PI) / 180)).toBeCloseTo(1, 6);
      }
    }
  });

  it('hält das Licht gegen die Drehung oben links', () => {
    for (const swim of swims) {
      const lights = swim.lightValues.split(';');
      expect(lights).toHaveLength(swim.lightKeyTimes.split(';').length);
      lights.forEach((value, k) => {
        const t = k / (lights.length - 1);
        const [lx, ly] = worldLight(keyframeValue(swim.rotation, t));
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
