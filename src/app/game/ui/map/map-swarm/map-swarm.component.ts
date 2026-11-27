import { Component, computed, input } from '@angular/core';

import { UnitSpriteComponent } from '../../art/unit-sprite/unit-sprite.component';
import { mapSwarmLayout } from './map-swarm.utils';

@Component({
  selector: 'g[app-map-swarm]',
  imports: [UnitSpriteComponent],
  templateUrl: './map-swarm.component.html',
  styleUrl: './map-swarm.component.css',
})
export class MapSwarmComponent {
  eaters = input.required<number>();
  brooders = input.required<number>();
  motion = input(true);

  layout = computed(() => mapSwarmLayout(this.eaters(), this.brooders()));
}
