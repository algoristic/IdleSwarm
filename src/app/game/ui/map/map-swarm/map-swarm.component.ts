import { Component, computed, input } from '@angular/core';

import { SmilBeginDirective } from '../../art/smil-begin/smil-begin.directive';
import { PARAMECIUM_ROLL_SMIL, PARAMECIUM_TIMING } from '../../art/unit-sprite/paramecium.utils';
import { UnitSpriteComponent } from '../../art/unit-sprite/unit-sprite.component';
import { mapSwarmLayout } from './map-swarm.utils';

@Component({
  selector: 'g[app-map-swarm]',
  imports: [SmilBeginDirective, UnitSpriteComponent],
  templateUrl: './map-swarm.component.html',
})
export class MapSwarmComponent {
  eaters = input.required<number>();
  brooders = input.required<number>();
  motion = input(true);

  roll = PARAMECIUM_ROLL_SMIL;
  rollDuration = `${PARAMECIUM_TIMING.roll}s`;

  layout = computed(() => mapSwarmLayout(this.eaters(), this.brooders()));
}
