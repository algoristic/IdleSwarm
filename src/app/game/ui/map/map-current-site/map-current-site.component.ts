import { Component, computed, input } from '@angular/core';

import { SiteTypeId } from '../../../domain/models/site.model';
import { mapSiteFill, mapCurrentSiteTransform } from '../map-site/map-site.utils';
import { MapSiteIconComponent } from '../map-site-icon/map-site-icon.component';
import { MAP_SITE_ICON_RADIUS } from '../map.model';

@Component({
  selector: 'g[app-map-current-site]',
  imports: [MapSiteIconComponent],
  templateUrl: './map-current-site.component.html',
  host: { '[attr.transform]': 'transform()' },
})
export class MapCurrentSiteComponent {
  type = input.required<SiteTypeId>();
  shape = input.required<number>();
  fillFraction = input(1);
  dead = input(false);

  radius = computed(() => MAP_SITE_ICON_RADIUS[this.type()]);
  transform = computed(() =>
    mapCurrentSiteTransform(mapSiteFill(this.fillFraction(), this.dead())),
  );
}
