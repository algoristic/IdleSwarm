import { Component, computed, input } from '@angular/core';

import { SITE_TYPE_IDS } from '@app/game/domain/models/site.model';
import { ZONE_IDS } from '@app/game/domain/models/zone.model';
import { MapCurrentSiteComponent } from '@app/game/ui/map/map-current-site/map-current-site.component';
import { MapFindComponent } from '@app/game/ui/map/map-find/map-find.component';
import { MapFindHighlight } from '@app/game/ui/map/map-find/map-find.model';
import { MapSiteComponent } from '@app/game/ui/map/map-site/map-site.component';
import { MapSiteHighlight } from '@app/game/ui/map/map-site/map-site.model';
import { MapSiteIconComponent } from '@app/game/ui/map/map-site-icon/map-site-icon.component';
import { MapSwarmComponent } from '@app/game/ui/map/map-swarm/map-swarm.component';
import { MapWaterComponent } from '@app/game/ui/map/map-water/map-water.component';
import { MAP_SITE_ICON_RADIUS, REACH_PX, MapZone } from '@app/game/ui/map/map.model';
import { FarMoodComponent } from '@app/game/ui/scene/far-mood/far-mood.component';
import { farMoodIndex } from '@app/game/ui/scene/mood.utils';
import { SITE_TYPE_NAMES } from '@app/game/ui/texts/game-texts';

import { CatalogChoice } from '../../domain/data/catalog.data';
import { CatalogControls, CatalogEntryId } from '../../domain/models/catalog.model';

const ITEM_HALF = 60;
const WATER_HALF = REACH_PX + 20;

// Jeder Wert der game-Typen braucht eine Option im Katalog; die Gegenrichtung prüfen die Input-Bindungen.
type UncoveredOption =
  | Exclude<MapZone, CatalogChoice<'mapZone'>>
  | Exclude<MapSiteHighlight, CatalogChoice<'siteHighlight'>>
  | Exclude<MapFindHighlight, CatalogChoice<'findHighlight'>>;
const _OPTIONS_COVER_GAME: [UncoveredOption] extends [never] ? true : never = true;

@Component({
  selector: 'app-catalog-map-preview',
  imports: [
    FarMoodComponent,
    MapCurrentSiteComponent,
    MapFindComponent,
    MapSiteComponent,
    MapSiteIconComponent,
    MapSwarmComponent,
    MapWaterComponent,
  ],
  templateUrl: './catalog-map-preview.component.html',
  host: { class: 'block' },
})
export class CatalogMapPreviewComponent {
  entry = input.required<CatalogEntryId>();
  controls = input.required<CatalogControls>();

  itemViewBox = `${-ITEM_HALF} ${-ITEM_HALF} ${2 * ITEM_HALF} ${2 * ITEM_HALF}`;
  iconViewBox = '-40 -40 80 80';
  swarmViewBox = '-45 -45 90 90';
  waterViewBox = `${-WATER_HALF} ${-WATER_HALF} ${2 * WATER_HALF} ${2 * WATER_HALF}`;
  farTransform = `scale(${(WATER_HALF / 1000).toFixed(3)})`;
  icons = SITE_TYPE_IDS.map((type) => ({
    type,
    name: SITE_TYPE_NAMES[type],
    radius: MAP_SITE_ICON_RADIUS[type],
  }));

  mood = computed(() => farMoodIndex(this.controls().zone, ZONE_IDS.length));
}
