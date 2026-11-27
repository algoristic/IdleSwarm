import { PROTOTYPE_SWARM_MINI } from './map-swarm.fixture';
import { MapSwarmLayout } from './map-swarm.model';
import { mapSwarmLayout } from './map-swarm.utils';

function toMarkup(layout: MapSwarmLayout): string {
  const brooders = layout.brooders
    .map((b) => `<g transform="${b.transform}"><use href="#brut"/></g>`)
    .join('');
  const eaters = layout.eaters
    .map(
      (f) =>
        `<g transform="${f.transform}"><g class="paddle${f.reverse ? ' paddle--rev' : ''}" style="animation-duration:${f.paddleDuration};animation-delay:${f.paddleDelay}">` +
        `<g transform="${f.spriteTransform}"><use href="#fress" class="roll" style="animation-duration:${f.rollDuration};animation-delay:${f.rollDelay}"/></g></g></g>`,
    )
    .join('');
  return `<g class="swirl swirl--map">${brooders}</g>${eaters}`;
}

describe('mapSwarmLayout', () => {
  it.each(PROTOTYPE_SWARM_MINI)(
    'ordnet $eaters Fresslinge und $brooders Brutlinge wie der Prototyp an',
    ({ eaters, brooders, markup }) => {
      expect(toMarkup(mapSwarmLayout(eaters, brooders))).toBe(markup);
    },
  );
});
