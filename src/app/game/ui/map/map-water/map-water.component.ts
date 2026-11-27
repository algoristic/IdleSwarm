import { Component } from '@angular/core';

import { MAP_COLORS } from '../../art/art-palette';
import { REACH_PX } from '../map.model';

@Component({
  selector: 'g[app-map-water]',
  templateUrl: './map-water.component.html',
})
export class MapWaterComponent {
  colors = MAP_COLORS.water;
  outerRadius = REACH_PX;
  middleRadius = REACH_PX * 0.68;
  innerRadius = REACH_PX * 0.34;
}
