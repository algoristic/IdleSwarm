import { Component, computed, input } from '@angular/core';

import { UnitId } from '../../../domain/models/unit.model';
import { UNIT_SPRITE_COLORS } from '../art-palette';
import { keyframeValue } from '../keyframes.utils';
import { easeSplines, formatPoint } from '../path.utils';
import { SmilBeginDirective } from '../smil-begin/smil-begin.directive';
import {
  AMOEBA_FLOW,
  AMOEBA_SCALE,
  AMOEBA_STROKE,
  AMOEBA_TIMING,
  AMOEBA_VARIANTS,
} from './amoeba.utils';
import { smilBegin, SPRITE_LIGHT, SpriteLight, VACUOLE_PULSE } from './figure.utils';
import {
  PARAMECIUM_ROLL_SMIL,
  PARAMECIUM_TIMING,
  PARAMECIUM_VARIANTS,
  VACUOLE_CANAL_PATH,
} from './paramecium.utils';
import { SpriteDetail } from './unit-sprite.model';

let nextClipId = 0;

const seconds = (value: number): string => `${value}s`;

@Component({
  selector: 'g[app-unit-sprite]',
  imports: [SmilBeginDirective],
  templateUrl: './unit-sprite.component.html',
})
export class UnitSpriteComponent {
  unit = input.required<UnitId>();
  variant = input(0);
  motion = input(false);
  detail = input<SpriteDetail>('full');
  phase = input<number | null>(null);
  light = input<SpriteLight | null>(null);

  colors = UNIT_SPRITE_COLORS;
  amoebaTiming = {
    outline: seconds(AMOEBA_TIMING.outline),
    nucleus: seconds(AMOEBA_TIMING.nucleus),
    vacuole: seconds(AMOEBA_TIMING.vacuole),
  };
  parameciumTiming = {
    ripple: seconds(PARAMECIUM_TIMING.ripple),
    roll: seconds(PARAMECIUM_TIMING.roll),
    cyclosis: seconds(PARAMECIUM_TIMING.cyclosis),
    vacuole: seconds(PARAMECIUM_TIMING.vacuole),
  };
  amoebaScale = `scale(${AMOEBA_SCALE})`;
  amoebaStroke = AMOEBA_STROKE;
  vacuolePulse = {
    values: VACUOLE_PULSE.values.join(';'),
    keyTimes: VACUOLE_PULSE.keyTimes.join(';'),
    keySplines: easeSplines(VACUOLE_PULSE.values.length - 1),
  };
  flow = {
    values: AMOEBA_FLOW.values.map((x) => `${x} 0`).join(';'),
    keyTimes: AMOEBA_FLOW.keyTimes.join(';'),
    keySplines: easeSplines(AMOEBA_FLOW.values.length - 1),
  };
  roll = PARAMECIUM_ROLL_SMIL;
  canals = VACUOLE_CANAL_PATH;
  staticLight = SPRITE_LIGHT;
  shapeId = `app-unit-sprite-shape-${nextClipId}`;
  shapeHref = `#${this.shapeId}`;
  clipId = `app-unit-sprite-${nextClipId++}`;
  clipUrl = `url(#${this.clipId})`;

  amoeba = computed(() => AMOEBA_VARIANTS[this.variant() % AMOEBA_VARIANTS.length]);
  paramecium = computed(() => PARAMECIUM_VARIANTS[this.variant() % PARAMECIUM_VARIANTS.length]);
  smilBegins = computed(() => {
    const phase = this.#phaseSeconds();
    return {
      outline: smilBegin(phase, AMOEBA_TIMING.outline),
      nucleus: smilBegin(phase, AMOEBA_TIMING.nucleus),
      vacuole: smilBegin(phase, AMOEBA_TIMING.vacuole),
      ripple: smilBegin(phase, PARAMECIUM_TIMING.ripple),
      roll: smilBegin(phase, PARAMECIUM_TIMING.roll),
      cyclosis: smilBegin(phase, PARAMECIUM_TIMING.cyclosis),
    };
  });
  foods = computed(() => {
    const variant = this.paramecium();
    const phase = this.#phaseSeconds();
    return variant.foods.map((food) => {
      const at = (phase + food.delay) / PARAMECIUM_TIMING.cyclosis;
      const point = [keyframeValue(variant.cyclosisX, at), keyframeValue(variant.cyclosisY, at)];
      return {
        ...food,
        begin: smilBegin(phase + food.delay, PARAMECIUM_TIMING.cyclosis),
        transform: `translate(${formatPoint([point[0], point[1]])})`,
      };
    });
  });
  vacuoles = computed(() => {
    const phase = this.#phaseSeconds();
    return this.paramecium().vacuoles.map((vacuole) => ({
      ...vacuole,
      begin: smilBegin(phase + vacuole.delay, PARAMECIUM_TIMING.vacuole),
    }));
  });
  #phaseSeconds = computed(() => this.phase() ?? this.#defaultPhase);

  #defaultPhase = ((nextClipId - 1) * 1.37) % AMOEBA_TIMING.nucleus;
}
