import { Component, input } from '@angular/core';

import { UnitId } from '../../../domain/models/unit.model';
import { UNIT_SPRITE_COLORS } from '../art-palette';

let nextClipId = 0;

@Component({
  selector: 'g[app-unit-sprite]',
  templateUrl: './unit-sprite.component.html',
})
export class UnitSpriteComponent {
  unit = input.required<UnitId>();

  colors = UNIT_SPRITE_COLORS;
  eaterPath =
    'M9 0C9-3.2 5-4.6 0-4.4C-6-4.2-9.5-3-9.5 0C-9.5 3-6 4.4-1 4.2C1 4.1 2 2.4 3.6 2.6C5.6 2.9 9 3 9 0Z';
  clipId = `app-unit-sprite-${nextClipId++}`;
  clipUrl = `url(#${this.clipId})`;
}
