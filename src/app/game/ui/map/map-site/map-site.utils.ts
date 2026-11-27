import { SiteTypeId } from '../../../domain/models/site.model';
import { MAP_COLORS } from '../../art/art-palette';
import { MAP_SITE_ICON_RADIUS, MapZone } from '../map.model';
import { MapSiteHighlight, MapSiteRing } from './map-site.model';

export function mapSiteFill(fillFraction: number, dead: boolean): number {
  return dead ? 0 : Math.max(0, fillFraction);
}

function mapSiteFillScale(fill: number): number {
  return 0.55 + 0.45 * Math.sqrt(fill);
}

export function mapSiteIconRadius(zone: MapZone, type: SiteTypeId, fill: number): number {
  const radius = MAP_SITE_ICON_RADIUS[type];
  return zone === 'next' ? radius * 0.85 : radius * mapSiteFillScale(fill);
}

export function mapSiteHitRadius(type: SiteTypeId): number {
  return MAP_SITE_ICON_RADIUS[type] + 10;
}

export function mapSiteRing(
  zone: MapZone,
  type: SiteTypeId,
  highlight: MapSiteHighlight,
): MapSiteRing | null {
  const radius = MAP_SITE_ICON_RADIUS[type];
  const { target, auto, nextZone } = MAP_COLORS.ring;
  if (zone === 'next') {
    const color = highlight === 'target' ? target : highlight === 'auto' ? auto : nextZone;
    return { radius: radius + 6, color, width: 1.6, dash: '3 4' };
  }
  if (highlight === 'none') return null;
  return {
    radius: radius + 7,
    color: highlight === 'target' ? target : auto,
    width: 1.8,
    dash: '4 3',
  };
}

export function mapCurrentSiteTransform(fill: number): string {
  return `scale(${(1.25 * mapSiteFillScale(fill)).toFixed(4)})`;
}
