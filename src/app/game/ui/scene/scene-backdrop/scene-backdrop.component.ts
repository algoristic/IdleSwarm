import { Component, computed, input } from '@angular/core';

import { SceneBackdropKind } from '../models/scene.model';
import { sceneBackdrop } from '../mood.utils';

let nextGradientId = 0;

@Component({
  selector: 'g[app-scene-backdrop]',
  templateUrl: './scene-backdrop.component.html',
})
export class SceneBackdropComponent {
  kind = input.required<SceneBackdropKind>();
  zone = input.required<number>();

  gradientId = `app-scene-backdrop-${nextGradientId++}`;
  rayGradientId = `${this.gradientId}-ray`;
  fill = `url(#${this.gradientId})`;
  rayFill = `url(#${this.rayGradientId})`;

  scene = computed(() => sceneBackdrop(this.kind(), this.zone()));
}
