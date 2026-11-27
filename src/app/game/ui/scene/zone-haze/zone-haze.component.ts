import { Component, computed, input } from '@angular/core';

import { SCENE_COLORS } from '../../art/art-palette';
import { zoneHazeScene } from '../mood.utils';

@Component({
  selector: 'g[app-zone-haze]',
  templateUrl: './zone-haze.component.html',
})
export class ZoneHazeComponent {
  zone = input.required<number>();

  speckColor = SCENE_COLORS.hazeSpeck;

  scene = computed(() => zoneHazeScene(this.zone()));
}
