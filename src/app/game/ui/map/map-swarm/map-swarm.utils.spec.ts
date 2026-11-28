import { eaterVariantFor } from '../../art/unit-sprite/eater.utils';
import { PROTOTYPE_SWARM_MINI } from './map-swarm.fixture';
import { MapSwarmLayout } from './map-swarm.model';
import { mapSwarmLayout } from './map-swarm.utils';

function toMarkup(layout: MapSwarmLayout): string {
  const brooders = layout.brooders
    .map((b) => `<g transform="${b.transform}"><use href="#brut"/></g>`)
    .join('');
  const eaters = layout.eaters.map((f) => `<g transform="${f.transform}"></g>`).join('');
  return `<g class="swirl swirl--map">${brooders}</g>${eaters}`;
}

function withoutPaddling(markup: string): string {
  return markup.replace(
    /<g transform="(translate\([^)]*\)) rotate\([^)]*\)"><g class="paddle.*?<\/g><\/g><\/g>/g,
    '<g transform="$1"></g>',
  );
}

describe('mapSwarmLayout', () => {
  it.each(PROTOTYPE_SWARM_MINI)(
    'ordnet $eaters Fresslinge und $brooders Brutlinge an den Plätzen des Prototyps an',
    ({ eaters, brooders, markup }) => {
      expect(toMarkup(mapSwarmLayout(eaters, brooders))).toBe(withoutPaddling(markup));
    },
  );

  it('gibt jedem Fressling die Variante seines Index', () => {
    const { eaters } = mapSwarmLayout(14, 0);
    expect(eaters.map((eater) => eater.variant)).toEqual(eaters.map((_, i) => eaterVariantFor(i)));
    expect(new Set(eaters.map((eater) => eater.variant)).size).toBeGreaterThan(2);
  });

  it('gibt jedem Fressling eine eigene Bahn mit negativem Start', () => {
    const { eaters } = mapSwarmLayout(14, 0);
    expect(new Set(eaters.map((eater) => eater.crawl.translateValues)).size).toBe(eaters.length);
    for (const eater of eaters) {
      expect(eater.begin).toMatch(/^-\d+\.\d{2}s$/);
      expect(eater.duration).toBe('72s');
    }
  });
});
