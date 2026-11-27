import { Component, computed, input } from '@angular/core';

import { SiteTypeId } from '../../../domain/models/site.model';
import { SITE_ICON_COLORS } from '../../art/art-palette';
import { CARCASS_CLAWS_PATH, CARCASS_LEGS_PATH, mapSiteIconGeometry } from './map-site-icon.utils';

@Component({
  selector: 'g[app-map-site-icon]',
  templateUrl: './map-site-icon.component.html',
})
export class MapSiteIconComponent {
  type = input.required<SiteTypeId>();
  shape = input.required<number>();
  radius = input.required<number>();

  colors = SITE_ICON_COLORS;
  carcassLegsPath = CARCASS_LEGS_PATH;
  carcassClawsPath = CARCASS_CLAWS_PATH;

  geometry = computed(() => mapSiteIconGeometry(this.type(), this.shape(), this.radius()));
}
