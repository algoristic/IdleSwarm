import { SiteTypeId } from '../../../domain/models/site.model';
import { RandomSource, blobPath, lcg } from '../../art/shape.utils';
import { MapSiteIconBlade, MapSiteIconDot, MapSiteIconGeometry } from './map-site-icon.model';

export const CARCASS_LEGS_PATH = 'M-3 3l-3 4M0 3.6l-1 4.6M3 3l3 4M-3-3l-3-4M0-3.6l-1-4.6M3-3l3-4';
export const CARCASS_CLAWS_PATH = 'M5.4-1.5q3.5-2 4.5-5M5.4 1.5q3.5 2 4.5 5';

export function mapSiteIconGeometry(
  type: SiteTypeId,
  shape: number,
  r: number,
): MapSiteIconGeometry {
  const random = lcg(shape);
  switch (type) {
    case 'algae':
      return {
        type,
        path: blobPath(r, shape),
        shadowTransform: `translate(${r * 0.09} ${r * 0.12})`,
      };
    case 'plankton':
      return {
        type,
        radius: r,
        innerRadius: r * 0.67,
        dots: scatterDots(random, r, 8, 0.62, 0.07, 0.05),
      };
    case 'carcass':
      return {
        type,
        transform: `rotate(${Math.round(random() * 360)}) scale(${(r / 6.3).toFixed(2)})`,
        bodyPath: blobPath(5.2, shape, 8, 0.12),
      };
    case 'marineSnow':
      return { type, radius: r, flakes: scatterDots(random, r, 7, 0.7, 0.1, 0.1) };
    case 'seagrass':
      return {
        type,
        groundCy: r * 0.5,
        groundRx: r * 1.1,
        groundRy: r * 0.3,
        blades: seagrassBlades(random, r),
      };
  }
}

function scatterDots(
  random: RandomSource,
  r: number,
  count: number,
  spread: number,
  minSize: number,
  sizeRange: number,
): MapSiteIconDot[] {
  const dots: MapSiteIconDot[] = [];
  for (let i = 0; i < count; i++) {
    const angle = random() * 6.28;
    const distance = Math.sqrt(random()) * r * spread;
    dots.push({
      cx: (Math.cos(angle) * distance).toFixed(1),
      cy: (Math.sin(angle) * distance).toFixed(1),
      r: (r * (minSize + random() * sizeRange)).toFixed(1),
    });
  }
  return dots;
}

function seagrassBlades(random: RandomSource, r: number): MapSiteIconBlade[] {
  const blades: MapSiteIconBlade[] = [];
  for (let i = 0; i < 9; i++) {
    const x = (i - 4) * r * 0.2;
    const h = r * (1.1 + random() * 0.7);
    const bend = (random() - 0.5) * r * 0.8;
    blades.push({
      d:
        `M${(x - r * 0.07).toFixed(1)} ${r * 0.5}` +
        `Q${(x + bend).toFixed(1)} ${(r * 0.5 - h * 0.6).toFixed(1)} ${(x + bend * 1.4).toFixed(1)} ${(r * 0.5 - h).toFixed(1)}` +
        `Q${(x + bend * 0.6 + r * 0.08).toFixed(1)} ${(r * 0.5 - h * 0.5).toFixed(1)} ${(x + r * 0.07).toFixed(1)} ${r * 0.5}Z`,
      odd: i % 2 === 1,
    });
  }
  return blades;
}
