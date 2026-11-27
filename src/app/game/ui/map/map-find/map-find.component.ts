import { Component, input } from '@angular/core';

import { MAP_COLORS } from '../../art/art-palette';
import { SparkleSpriteComponent } from '../../art/sparkle-sprite/sparkle-sprite.component';
import { MapZone } from '../map.model';
import { MapFindHighlight } from './map-find.model';

@Component({
  selector: 'g[app-map-find]',
  imports: [SparkleSpriteComponent],
  templateUrl: './map-find.component.html',
  host: { class: 'cursor-pointer' },
})
export class MapFindComponent {
  zone = input<MapZone>('current');
  highlight = input<MapFindHighlight>('none');

  colors = MAP_COLORS;
}
