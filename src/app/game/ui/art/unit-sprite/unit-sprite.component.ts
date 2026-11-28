import { Component, computed, input } from '@angular/core';

import { UnitId } from '../../../domain/models/unit.model';
import { UNIT_SPRITE_COLORS } from '../art-palette';
import { easeSplines } from '../path.utils';
import { EATER_TIMING, EATER_VARIANTS, EaterDetail, VACUOLE_PULSE } from './eater.utils';

let nextClipId = 0;

@Component({
  selector: 'g[app-unit-sprite]',
  templateUrl: './unit-sprite.component.html',
})
export class UnitSpriteComponent {
  unit = input.required<UnitId>();
  variant = input(0);
  motion = input(false);
  detail = input<EaterDetail>('full');

  colors = UNIT_SPRITE_COLORS;
  eaterTiming = {
    outline: `${EATER_TIMING.outline}s`,
    nucleus: `${EATER_TIMING.nucleus}s`,
    vacuole: `${EATER_TIMING.vacuole}s`,
  };
  vacuolePulse = {
    values: VACUOLE_PULSE.values.join(';'),
    keyTimes: VACUOLE_PULSE.keyTimes.join(';'),
    keySplines: easeSplines(VACUOLE_PULSE.values.length - 1),
  };
  begin = `-${((nextClipId * 1.37) % EATER_TIMING.nucleus).toFixed(2)}s`;
  shapeId = `app-unit-sprite-shape-${nextClipId}`;
  shapeHref = `#${this.shapeId}`;
  clipId = `app-unit-sprite-${nextClipId++}`;
  clipUrl = `url(#${this.clipId})`;

  eater = computed(() => EATER_VARIANTS[this.variant() % EATER_VARIANTS.length]);
}
