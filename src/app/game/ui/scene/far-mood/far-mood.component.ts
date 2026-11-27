import { Component, computed, input } from '@angular/core';

import { farMoodScene } from '../mood.utils';

let nextGradientId = 0;

@Component({
  selector: 'g[app-far-mood]',
  templateUrl: './far-mood.component.html',
})
export class FarMoodComponent {
  mood = input.required<number>();

  gradientId = `app-far-mood-${nextGradientId++}`;
  rayGradientId = `${this.gradientId}-ray`;
  fill = `url(#${this.gradientId})`;
  rayFill = `url(#${this.rayGradientId})`;

  scene = computed(() => farMoodScene(this.mood()));
}
