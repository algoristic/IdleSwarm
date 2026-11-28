import { Component, computed, input } from '@angular/core';

import { UnitId } from '../../../domain/models/unit.model';
import { UNIT_SPRITE_COLORS } from '../art-palette';
import { easeSplines } from '../path.utils';
import {
  EATER_FLOW,
  EATER_LIGHT,
  EATER_TIMING,
  EATER_VARIANTS,
  EaterDetail,
  EaterLight,
  VACUOLE_PULSE,
} from './eater.utils';

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
  phase = input<number | null>(null);
  light = input<EaterLight | null>(null);

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
  flow = {
    values: EATER_FLOW.values.map((x) => `${x} 0`).join(';'),
    keyTimes: EATER_FLOW.keyTimes.join(';'),
    keySplines: easeSplines(EATER_FLOW.values.length - 1),
  };
  staticLight = EATER_LIGHT;
  shapeId = `app-unit-sprite-shape-${nextClipId}`;
  shapeHref = `#${this.shapeId}`;
  clipId = `app-unit-sprite-${nextClipId++}`;
  clipUrl = `url(#${this.clipId})`;

  eater = computed(() => EATER_VARIANTS[this.variant() % EATER_VARIANTS.length]);
  begin = computed(() => `-${(this.phase() ?? this.#defaultPhase).toFixed(2)}s`);

  #defaultPhase = ((nextClipId - 1) * 1.37) % EATER_TIMING.nucleus;
}
