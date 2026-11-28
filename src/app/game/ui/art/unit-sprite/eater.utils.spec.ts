import { keyframeValue } from '../keyframes.utils';
import { smoothPath } from '../path.utils';
import {
  EATER_TIMING,
  EATER_VARIANT_COUNT,
  EATER_VARIANTS,
  CrawlArea,
  eaterCrawl,
  eaterPhaseOffset,
  eaterVariantFor,
} from './eater.utils';

const GLOW = 2;

describe('EATER_VARIANTS', () => {
  it('hat fünf verschiedene Varianten', () => {
    expect(EATER_VARIANTS).toHaveLength(EATER_VARIANT_COUNT);
    expect(new Set(EATER_VARIANTS.map((v) => v.body)).size).toBe(EATER_VARIANT_COUNT);
  });

  it('setzt jede Alge aus ein bis drei Kügelchen zusammen', () => {
    for (const variant of EATER_VARIANTS) {
      expect(variant.algae).toHaveLength(2);
      for (const alga of variant.algae) {
        expect(alga.cells.length).toBeGreaterThanOrEqual(1);
        expect(alga.cells.length).toBeLessThanOrEqual(3);
      }
    }
    const counts = EATER_VARIANTS.flatMap((v) => v.algae.map((a) => a.cells.length));
    expect(new Set(counts).size).toBeGreaterThan(1);
  });

  it('bleibt mit Leuchtsaum in der Box ±12', () => {
    for (const variant of EATER_VARIANTS) {
      for (let i = 0; i < 24; i++) {
        const phase = (i / 24) * Math.PI * 2;
        for (const [x, y] of variant.outline(phase)) {
          expect(Math.max(Math.abs(x), Math.abs(y)) + GLOW).toBeLessThanOrEqual(12);
        }
      }
    }
  });

  it('behält in jedem Bild dieselben Befehle, damit d interpoliert', () => {
    for (const variant of EATER_VARIANTS) {
      for (const frames of [variant.bodyFrames, variant.innerFrames]) {
        const commands = frames.split(';').map((frame) => frame.replace(/[^MCZ]/g, ''));
        expect(new Set(commands).size).toBe(1);
      }
      expect(variant.body).toBe(smoothPath(variant.outline(0)));
    }
  });

  it('führt den Kern im Takt der SVG-Animation zum Start zurück', () => {
    for (const variant of EATER_VARIANTS) {
      const { values } = variant.nucleusX;
      expect(values[values.length - 1]).toBe(values[0]);
    }
  });
});

describe('Figuren', () => {
  it('ordnet jedem Index fest eine Variante und einen Versatz zu', () => {
    const variants = Array.from({ length: 48 }, (_, i) => eaterVariantFor(i));
    expect(variants).toEqual(Array.from({ length: 48 }, (_, i) => eaterVariantFor(i)));
    expect(new Set(variants)).toEqual(new Set([0, 1, 2, 3, 4]));
    for (let i = 0; i < 48; i++) {
      expect(eaterPhaseOffset(i)).toBeGreaterThanOrEqual(0);
      expect(eaterPhaseOffset(i)).toBeLessThan(EATER_TIMING.nucleus);
    }
  });
});

describe('eaterCrawl', () => {
  const STEP = 16;
  const INNER = 40;
  const OUTER = 140;
  const areaFor = (i: number): CrawlArea => {
    const angle = i * 2.39996;
    return {
      start: [Math.cos(angle) * 80, Math.sin(angle) * 80],
      inner: INNER,
      outer: OUTER,
      step: STEP,
    };
  };
  const crawls = Array.from({ length: 12 }, (_, i) => eaterCrawl(i, areaFor(i)));

  it('wandert in 12 Schüben zu 6 s und kehrt zum Platz zurück', () => {
    for (const { duration, x, y, rotation } of crawls) {
      expect(duration).toBe(12 * EATER_TIMING.outline);
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
    expect(speed(EATER_TIMING.outline)).toBeLessThan(speed(EATER_TIMING.outline * 1.5) / 10);
  });

  it('ist je Index stabil und verschieden', () => {
    expect(eaterCrawl(3, areaFor(3))).toEqual(crawls[3]);
    expect(new Set(crawls.map((c) => c.translateValues)).size).toBe(crawls.length);
  });

  it('liefert gleich viele SMIL-Werte wie Zeitmarken', () => {
    for (const crawl of crawls) {
      const count = crawl.keyTimes.split(';').length;
      expect(crawl.translateValues.split(';')).toHaveLength(count);
      expect(crawl.rotateValues.split(';')).toHaveLength(count);
      expect(crawl.keySplines.split(';')).toHaveLength(count - 1);
    }
  });
});
