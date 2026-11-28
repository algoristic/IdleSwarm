import { keyframeValue } from '../keyframes.utils';
import { smoothPath } from '../path.utils';
import {
  AMOEBA_TIMING,
  AMOEBA_VARIANT_COUNT,
  AMOEBA_VARIANTS,
  amoebaCrawl,
  amoebaPhaseOffset,
  amoebaVariantFor,
} from './amoeba.utils';
import { WalkArea, worldLight } from './figure.utils';

const GLOW = 2;

describe('AMOEBA_VARIANTS', () => {
  it('hat fünf verschiedene Varianten', () => {
    expect(AMOEBA_VARIANTS).toHaveLength(AMOEBA_VARIANT_COUNT);
    expect(new Set(AMOEBA_VARIANTS.map((v) => v.body)).size).toBe(AMOEBA_VARIANT_COUNT);
  });

  it('trägt zwei bis drei Eier mit Glanzpunkt', () => {
    for (const variant of AMOEBA_VARIANTS) {
      expect(variant.eggs.length).toBeGreaterThanOrEqual(2);
      expect(variant.eggs.length).toBeLessThanOrEqual(3);
      for (const egg of variant.eggs) {
        expect(egg.highlight).toEqual([-0.4 * egg.r, -0.4 * egg.r]);
      }
    }
    expect(new Set(AMOEBA_VARIANTS.map((v) => v.eggs.length)).size).toBeGreaterThan(1);
  });

  it('bleibt mit Leuchtsaum in der Box ±12', () => {
    for (const variant of AMOEBA_VARIANTS) {
      for (let i = 0; i < 24; i++) {
        const phase = (i / 24) * Math.PI * 2;
        for (const [x, y] of variant.outline(phase)) {
          expect(Math.max(Math.abs(x), Math.abs(y)) + GLOW).toBeLessThanOrEqual(12);
        }
      }
    }
  });

  it('behält in jedem Bild dieselben Befehle, damit d interpoliert', () => {
    for (const variant of AMOEBA_VARIANTS) {
      for (const frames of [variant.bodyFrames, variant.innerFrames]) {
        const commands = frames.split(';').map((frame) => frame.replace(/[^MCZ]/g, ''));
        expect(new Set(commands).size).toBe(1);
      }
      expect(variant.body).toBe(smoothPath(variant.outline(0)));
    }
  });

  it('schiebt die Front nach +x vor und lässt den Rest folgen', () => {
    for (const variant of AMOEBA_VARIANTS) {
      for (let i = 0; i < 8; i++) {
        const points = variant.outline((i / 8) * Math.PI * 2);
        const front = Math.max(...points.map(([x]) => x));
        const rear = -Math.min(...points.map(([x]) => x));
        expect(front).toBeGreaterThan(rear);
      }
    }
  });

  it('greift in der Ruhe vor und zieht das Scheinfüßchen im Schub ein', () => {
    const front = (points: readonly (readonly number[])[]): number =>
      Math.max(...points.map(([x]) => x));
    const aspect = (points: readonly (readonly number[])[]): number => {
      const xs = points.map(([x]) => x);
      const ys = points.map(([, y]) => y);
      return (Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys));
    };
    for (const variant of AMOEBA_VARIANTS) {
      expect(front(variant.outline(0))).toBeGreaterThan(front(variant.outline(Math.PI)));
      for (let i = 0; i < 8; i++) {
        expect(aspect(variant.outline((i / 8) * Math.PI * 2))).toBeGreaterThan(1);
      }
    }
  });

  it('führt den Kern im Takt der SVG-Animation zum Start zurück', () => {
    for (const variant of AMOEBA_VARIANTS) {
      const { values } = variant.nucleusX;
      expect(values[values.length - 1]).toBe(values[0]);
    }
  });
});

describe('Figuren', () => {
  it('ordnet jedem Index fest eine Variante und einen Versatz zu', () => {
    const variants = Array.from({ length: 48 }, (_, i) => amoebaVariantFor(i));
    expect(variants).toEqual(Array.from({ length: 48 }, (_, i) => amoebaVariantFor(i)));
    expect(new Set(variants)).toEqual(new Set([0, 1, 2, 3, 4]));
    for (let i = 0; i < 48; i++) {
      expect(amoebaPhaseOffset(i)).toBeGreaterThanOrEqual(0);
      expect(amoebaPhaseOffset(i)).toBeLessThan(AMOEBA_TIMING.nucleus);
    }
  });
});

describe('amoebaCrawl', () => {
  const STEP = 16;
  const INNER = 40;
  const OUTER = 140;
  const areaFor = (i: number): WalkArea => {
    const angle = i * 2.39996;
    return {
      start: [Math.cos(angle) * 80, Math.sin(angle) * 80],
      inner: INNER,
      outer: OUTER,
      step: STEP,
    };
  };
  const crawls = Array.from({ length: 12 }, (_, i) => amoebaCrawl(i, areaFor(i)));

  it('wandert in 12 Schüben zu 6 s und kehrt zum Platz zurück', () => {
    for (const { duration, x, y, rotation } of crawls) {
      expect(duration).toBe(12 * AMOEBA_TIMING.outline);
      expect(x.values).toHaveLength(13);
      expect([x.values[0], y.values[0]]).toEqual([0, 0]);
      expect([x.values[12], y.values[12]]).toEqual([0, 0]);
      const turn = rotation.values[12] - rotation.values[0];
      expect(Math.abs(turn / 360 - Math.round(turn / 360))).toBeLessThan(1e-9);
    }
  });

  it('bleibt im Ring um die Schwarmmitte und dreht ohne Sprünge', () => {
    crawls.forEach(({ x, y, rotation }, i) => {
      const [sx, sy] = areaFor(i).start;
      x.values.forEach((value, k) => {
        const distance = Math.hypot(sx + value, sy + y.values[k]);
        expect(distance).toBeGreaterThan(INNER - 1e-6);
        expect(distance).toBeLessThan(OUTER + 1e-6);
      });
      for (let k = 1; k < rotation.values.length; k++) {
        expect(Math.abs(rotation.values[k] - rotation.values[k - 1])).toBeLessThan(180);
      }
    });
  });

  it('schiebt sich je Schub etwa eine Körperlänge weiter', () => {
    for (const { x, y } of crawls) {
      let total = 0;
      for (let k = 1; k < x.values.length; k++) {
        total += Math.hypot(x.values[k] - x.values[k - 1], y.values[k] - y.values[k - 1]);
      }
      const mean = total / (x.values.length - 1);
      expect(mean).toBeGreaterThan(0.5 * STEP);
      expect(mean).toBeLessThan(1.6 * STEP);
    }
  });

  it('steht an den Keyframes fast still', () => {
    const { x, y, duration } = crawls[0];
    const at = (t: number): [number, number] => [
      keyframeValue(x, t / duration),
      keyframeValue(y, t / duration),
    ];
    const speed = (t: number): number => {
      const [x0, y0] = at(t);
      const [x1, y1] = at(t + 0.05);
      return Math.hypot(x1 - x0, y1 - y0);
    };
    expect(speed(AMOEBA_TIMING.outline)).toBeLessThan(speed(AMOEBA_TIMING.outline * 1.5) / 10);
  });

  it('ist je Index stabil und verschieden', () => {
    expect(amoebaCrawl(3, areaFor(3))).toEqual(crawls[3]);
    expect(new Set(crawls.map((c) => c.translateValues)).size).toBe(crawls.length);
  });

  it('dreht die Front in Laufrichtung', () => {
    for (const { x, y, rotation } of crawls) {
      const heading = Math.atan2(y.values[2] - y.values[1], x.values[2] - x.values[1]);
      const before = Math.atan2(y.values[1] - y.values[0], x.values[1] - x.values[0]);
      const turn = (rotation.values[1] * Math.PI) / 180;
      const bisector = Math.atan2(
        Math.sin(heading) + Math.sin(before),
        Math.cos(heading) + Math.cos(before),
      );
      expect(Math.cos(turn - bisector)).toBeCloseTo(1, 6);
    }
  });

  it('hält das Licht gegen die Drehung oben links', () => {
    expect(worldLight(0)).toEqual([-0.5, -1.1]);
    for (const crawl of crawls) {
      crawl.lightValues.split(';').forEach((value, k) => {
        const [lx, ly] = value.split(' ').map(Number);
        const turn = (crawl.rotation.values[k] * Math.PI) / 180;
        const world = [
          lx * Math.cos(turn) - ly * Math.sin(turn),
          lx * Math.sin(turn) + ly * Math.cos(turn),
        ];
        expect(world[0]).toBeCloseTo(-0.5, 1);
        expect(world[1]).toBeCloseTo(-1.1, 1);
      });
    }
  });

  it('liefert gleich viele SMIL-Werte wie Zeitmarken', () => {
    for (const crawl of crawls) {
      const count = crawl.keyTimes.split(';').length;
      expect(crawl.translateValues.split(';')).toHaveLength(count);
      expect(crawl.rotateValues.split(';')).toHaveLength(count);
      expect(crawl.lightValues.split(';')).toHaveLength(count);
      expect(crawl.keySplines.split(';')).toHaveLength(count - 1);
    }
  });
});
