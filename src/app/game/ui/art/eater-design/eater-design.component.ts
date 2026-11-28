import { Component, input } from '@angular/core';

import { EATER_DESIGN_COLORS } from '../art-palette';
import { easeSplines } from '../path.utils';
import { EaterDesignId } from './eater-design.model';
import {
  BACILLUS,
  DIATOM,
  DINOFLAGELLATE,
  HELIOZOAN,
  PARAMECIUM,
  PRISM,
  SPIRAL,
  STENTOR,
} from './eater-design.utils';

let nextInstance = 0;

const offset = (delay: number): string => `-${delay.toFixed(2)}s`;

@Component({
  selector: 'g[app-eater-design]',
  templateUrl: './eater-design.component.html',
})
export class EaterDesignComponent {
  design = input.required<EaterDesignId>();
  motion = input(true);

  colors = EATER_DESIGN_COLORS;
  paramecium = PARAMECIUM;
  bacillus = BACILLUS;
  dinoflagellate = DINOFLAGELLATE;
  heliozoan = HELIOZOAN;
  diatom = DIATOM;
  stentor = STENTOR;
  spiral = SPIRAL;
  prism = PRISM;
  splines2 = easeSplines(2);
  splines3 = easeSplines(3);
  delay = (nextInstance * 1.37) % 6;
  begin = offset(this.delay);
  vacuoles = PARAMECIUM.vacuoles.map((v) => ({ ...v, begin: offset(this.delay + v.delay) }));
  foods = PARAMECIUM.foods.map((f) => ({ ...f, begin: offset(this.delay + f.delay) }));
  rays = HELIOZOAN.rays.map((ray) => ({ ...ray, begin: offset(this.delay + ray.delay) }));
  segments = SPIRAL.segments.map((s) => ({ ...s, begin: offset(this.delay + s.delay) }));
  particles = SPIRAL.particles.map((p) => ({ ...p, begin: offset(this.delay + p.delay) }));
  shards = PRISM.shards.map((s) => ({ ...s, begin: offset(this.delay + s.delay) }));
  clipId = `app-eater-design-clip-${nextInstance}`;
  clipUrl = `url(#${this.clipId})`;
  shapeId = `app-eater-design-shape-${nextInstance++}`;
  shapeHref = `#${this.shapeId}`;
}
