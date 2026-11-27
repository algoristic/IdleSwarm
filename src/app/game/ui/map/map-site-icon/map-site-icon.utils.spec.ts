import { SITE_ICON_COLORS } from '../../art/art-palette';
import { MAP_SITE_ICON_RADIUS } from '../map.model';
import { PROTOTYPE_ICON_RADIUS, PROTOTYPE_SITE_ICONS } from './map-site-icon.fixture';
import { MapSiteIconDot, MapSiteIconGeometry } from './map-site-icon.model';
import {
  CARCASS_CLAWS_PATH,
  CARCASS_ICON_LEGS_PATH,
  mapSiteIconGeometry,
} from './map-site-icon.utils';

const dots = (list: MapSiteIconDot[]): string =>
  list.map((d) => `<circle cx="${d.cx}" cy="${d.cy}" r="${d.r}"/>`).join('');

function toMarkup(g: MapSiteIconGeometry): string {
  const c = SITE_ICON_COLORS;
  switch (g.type) {
    case 'algae':
      return `<path d="${g.path}" fill="${c.algae.shadow}" transform="${g.shadowTransform}"/><path d="${g.path}" fill="${c.algae.body}"/>`;
    case 'plankton':
      return `<circle r="${g.radius}" fill="${c.plankton.outer}"/><circle r="${g.innerRadius}" fill="${c.plankton.inner}"/><g fill="${c.plankton.dots}">${dots(g.dots)}</g>`;
    case 'carcass':
      return `<g transform="${g.transform}"><g stroke="${c.carcass.legs}" stroke-width="1.2" stroke-linecap="round" fill="none"><path d="${CARCASS_ICON_LEGS_PATH}"/><path d="${CARCASS_CLAWS_PATH}"/></g><path d="${g.bodyPath}" fill="${c.carcass.shadow}" transform="translate(.6 .9)"/><path d="${g.bodyPath}" fill="${c.carcass.body}"/></g>`;
    case 'marineSnow':
      return `<circle r="${g.radius}" fill="${c.marineSnow.body}"/><g fill="${c.marineSnow.flakes}">${dots(g.flakes)}</g>`;
    case 'seagrass':
      return (
        `<ellipse cy="${g.groundCy}" rx="${g.groundRx}" ry="${g.groundRy}" fill="${c.seagrass.ground}"/>` +
        g.blades
          .map(
            (b) =>
              `<path d="${b.d}" fill="${b.odd ? c.seagrass.bladeOdd : c.seagrass.bladeEven}"/>`,
          )
          .join('')
      );
  }
}

describe('mapSiteIconGeometry', () => {
  it.each(PROTOTYPE_SITE_ICONS)(
    'zeichnet $type mit shape $shape und r $radius wie der Prototyp',
    ({ type, shape, radius, markup }) => {
      expect(toMarkup(mapSiteIconGeometry(type, shape, radius))).toBe(markup);
    },
  );

  it('übernimmt die Symbolradien des Prototyps', () => {
    expect(MAP_SITE_ICON_RADIUS).toEqual(PROTOTYPE_ICON_RADIUS);
  });
});
