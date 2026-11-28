import { amoebaPhaseOffset, amoebaVariantFor } from '../../art/unit-sprite/amoeba.utils';
import {
  parameciumPhaseOffset,
  parameciumVariantFor,
} from '../../art/unit-sprite/paramecium.utils';
import { PROTOTYPE_SWARM_MINI } from './map-swarm.fixture';
import { mapSwarmLayout } from './map-swarm.utils';

function prototypePlaces(markup: string): { brooders: string[]; eaters: string[] } {
  const swirlEnd = markup.indexOf('</g></g>') + 4;
  const brooderPart = markup.includes('<use href="#brut"/>') ? markup.slice(0, swirlEnd) : '';
  const places = (part: string, pattern: RegExp): string[] =>
    [...part.matchAll(pattern)].map(([, place]) => `translate(${place})`);
  return {
    brooders: places(
      brooderPart,
      /<g transform="translate\(([^)]*)\) rotate\([^)]*\) scale\(\.42\)">/g,
    ),
    eaters: places(
      markup,
      /<g transform="translate\(([^)]*)\) rotate\([^)]*\)"><g class="paddle[ a-z-]*"/g,
    ),
  };
}

describe('mapSwarmLayout', () => {
  it.each(PROTOTYPE_SWARM_MINI)(
    'setzt $eaters Fresslinge und $brooders Brutlinge an die Startplätze des Prototyps',
    ({ eaters, brooders, markup }) => {
      const layout = mapSwarmLayout(eaters, brooders);
      expect({
        brooders: layout.brooders.map((b) => b.transform),
        eaters: layout.eaters.map((e) => e.transform),
      }).toEqual(prototypePlaces(markup));
    },
  );

  it('gibt jeder Figur die Variante ihres Index', () => {
    const { eaters, brooders } = mapSwarmLayout(14, 1000);
    expect(eaters.map((e) => e.variant)).toEqual(eaters.map((_, i) => parameciumVariantFor(i)));
    expect(brooders.map((b) => b.variant)).toEqual(brooders.map((_, i) => amoebaVariantFor(i)));
    expect(new Set(eaters.map((e) => e.variant)).size).toBeGreaterThan(2);
  });

  it('lässt die Fresslinge auf eigenen Bahnen gleiten', () => {
    const { eaters } = mapSwarmLayout(14, 0);
    expect(new Set(eaters.map((e) => e.path)).size).toBe(eaters.length);
    eaters.forEach((eater, i) => {
      expect(eater.phase).toBe(parameciumPhaseOffset(i));
      expect(eater.begin).toMatch(/^-\d+\.\d{2}s$/);
      expect(eater.path).toMatch(/^M0\.00 0\.00C.*Z$/);
      expect(eater.light.calcMode).toBe('linear');
      expect(eater.light.duration).toBe(eater.duration);
      expect(eater.light.begin).toBe(eater.begin);
    });
  });

  it('lässt die Brutlinge in der Mitte kriechen', () => {
    const { brooders } = mapSwarmLayout(0, 1000);
    expect(brooders).toHaveLength(3);
    brooders.forEach((brooder, i) => {
      expect(brooder.phase).toBe(amoebaPhaseOffset(i));
      expect(brooder.duration).toBe('72s');
      expect(brooder.light).toEqual({
        start: `translate(${brooder.crawl.lightValues.split(';')[0]})`,
        values: brooder.crawl.lightValues,
        keyTimes: brooder.crawl.keyTimes,
        keySplines: brooder.crawl.keySplines,
        calcMode: 'spline',
        duration: brooder.duration,
        begin: brooder.begin,
      });
    });
  });
});
