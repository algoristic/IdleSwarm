import { Component, input } from '@angular/core';

import { AMOEBA_COLORS } from '../art-palette';
import { EaterDesignId } from './eater-design.model';
import { amoebaOutline, outlineFrames, wander } from './eater-design.utils';

let nextInstance = 0;

@Component({
  selector: 'g[app-eater-design]',
  templateUrl: './eater-design.component.html',
})
export class EaterDesignComponent {
  design = input.required<EaterDesignId>();
  motion = input(false);

  colors = AMOEBA_COLORS;
  amoebaPath = amoebaOutline(0, 0);
  amoebaWave = outlineFrames(8, (phase) => amoebaOutline(phase, 0.45));
  nucleus = wander(nextInstance * 31 + 5, 1.1, 6);
  vacuoles = [
    {
      transform: 'translate(3.4 -.6)',
      r: 1.2,
      path: wander(nextInstance * 31 + 11, 0.9, 5),
      dur: '5.3s',
    },
    {
      transform: 'translate(-5.8 -1.2)',
      r: 0.8,
      path: wander(nextInstance * 31 + 17, 0.6, 5),
      dur: '6.1s',
    },
  ];
  begin = `-${((nextInstance * 1.7) % 6).toFixed(1)}s`;
  clipId = `app-eater-design-clip-${nextInstance}`;
  clipUrl = `url(#${this.clipId})`;
  shapeId = `app-eater-design-shape-${nextInstance++}`;
  shapeHref = `#${this.shapeId}`;
}
