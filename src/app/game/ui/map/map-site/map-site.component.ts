import { Component, computed, input } from '@angular/core';

import { SiteTypeId } from '../../../domain/models/site.model';
import { MapSiteIconComponent } from '../map-site-icon/map-site-icon.component';
import { MapZone } from '../map.model';
import { MapSiteHighlight } from './map-site.model';
import { mapSiteFill, mapSiteHitRadius, mapSiteIconRadius, mapSiteRing } from './map-site.utils';

@Component({
  selector: 'g[app-map-site]',
  imports: [MapSiteIconComponent],
  templateUrl: './map-site.component.html',
  host: { '[class]': 'classes()' },
})
export class MapSiteComponent {
  type = input.required<SiteTypeId>();
  shape = input.required<number>();
  fillFraction = input(1);
  dead = input(false);
  zone = input<MapZone>('current');
  highlight = input<MapSiteHighlight>('none');
  here = input(false);

  classes = computed(() =>
    this.zone() === 'current' && this.dead() ? 'cursor-pointer opacity-35' : 'cursor-pointer',
  );
  hitRadius = computed(() => mapSiteHitRadius(this.type()));
  iconRadius = computed(() =>
    mapSiteIconRadius(this.zone(), this.type(), mapSiteFill(this.fillFraction(), this.dead())),
  );
  ring = computed(() => mapSiteRing(this.zone(), this.type(), this.highlight()));
}
