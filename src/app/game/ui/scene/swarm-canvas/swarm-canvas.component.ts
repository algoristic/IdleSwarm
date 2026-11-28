import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';

import { UNIT_IDS, UnitId } from '../../../domain/models/unit.model';
import { drawEater } from '../../art/unit-sprite/eater-canvas.utils';
import { eaterPhaseOffset, eaterVariantFor } from '../../art/unit-sprite/eater.utils';
import { UnitSpriteComponent } from '../../art/unit-sprite/unit-sprite.component';
import { UNIT_SPRITE_HALF_EXTENT } from '../../art/unit-sprite/unit-sprite.model';
import { SwarmSprite, TrekTransition } from '../models/swarm.model';
import {
  buildSwarmDrift,
  canvasPixelRatio,
  drawSwarmFrame,
  SWARM_CANVAS_BOX,
  spriteDataUrl,
  spriteDocument,
  spritePixels,
} from '../swarm-draw.utils';
import { swarmFigures } from '../swarm-formation.utils';
import { flowRotation, nextTrek } from '../swarm-motion.utils';

type DocumentView = NonNullable<Document['defaultView']>;

@Component({
  selector: 'app-swarm-canvas',
  imports: [UnitSpriteComponent],
  templateUrl: './swarm-canvas.component.html',
  host: { class: 'block' },
})
export class SwarmCanvasComponent {
  readonly #document = inject(DOCUMENT);
  readonly #destroyRef = inject(DestroyRef);

  units = input.required<readonly number[]>();
  travelAngle = input<number | null>(null);
  motion = input(true);

  rasterUnits = UNIT_IDS.filter((unit) => unit !== 'eater');

  canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  spriteDefs = viewChild.required<ElementRef<SVGSVGElement>>('spriteDefs');

  #travelling = computed(() => this.travelAngle() !== null);
  #figures = computed(() => swarmFigures(this.units(), this.#travelling()));
  #drift = computed(() => buildSwarmDrift(this.#travelling()));

  #sprites: Partial<Record<UnitId, SwarmSprite>> = {
    eater: {
      kind: 'animated',
      draw: (ctx, time, index) =>
        drawEater(ctx, eaterVariantFor(index), time, eaterPhaseOffset(index), 'full'),
    },
  };
  #trek: TrekTransition = { from: 0, to: 0, at: 0 };
  #view: DocumentView | null = null;
  #frameId: number | null = null;
  #destroyed = false;

  constructor() {
    afterNextRender(() => this.#start());
    this.#destroyRef.onDestroy(() => this.#stop());
  }

  #start(): void {
    const view = this.#document.defaultView;
    const canvas = this.canvas().nativeElement;
    const ctx = view && !this.#destroyed ? canvas.getContext('2d') : null;
    if (!view || !ctx) return;
    this.#view = view;
    const k = canvasPixelRatio(view.devicePixelRatio);
    canvas.width = Math.round(SWARM_CANVAS_BOX.width * k);
    canvas.height = Math.round(SWARM_CANVAS_BOX.height * k);
    this.#rasterSprites(view, k);
    const frame = (now: number): void => {
      this.#draw(ctx, k, now);
      this.#frameId = view.requestAnimationFrame(frame);
    };
    this.#frameId = view.requestAnimationFrame(frame);
  }

  #stop(): void {
    this.#destroyed = true;
    if (this.#view && this.#frameId !== null) this.#view.cancelAnimationFrame(this.#frameId);
    this.#frameId = null;
  }

  #draw(ctx: CanvasRenderingContext2D, k: number, now: number): void {
    const travelAngle = this.travelAngle();
    this.#trek = nextTrek(this.#trek, travelAngle, now);
    drawSwarmFrame(ctx, {
      now,
      motion: this.motion(),
      pixelRatio: k,
      drift: this.#drift(),
      flowRotation: flowRotation(travelAngle),
      trek: this.#trek,
      swirl: travelAngle === null,
      figures: this.#figures(),
      sprites: this.#sprites,
    });
  }

  #rasterSprites(view: DocumentView, k: number): void {
    const serializer = new view.XMLSerializer();
    const defs = this.spriteDefs().nativeElement;
    for (const unit of this.rasterUnits) {
      const element = defs.querySelector(`[data-unit="${unit}"]`);
      if (!element) continue;
      const halfExtent = UNIT_SPRITE_HALF_EXTENT[unit];
      const pixels = spritePixels(halfExtent, k);
      const image = new view.Image();
      image.src = spriteDataUrl(
        spriteDocument(serializer.serializeToString(element), halfExtent, pixels),
      );
      image
        .decode()
        .then(() => {
          if (this.#destroyed) return;
          const sprite = this.#document.createElement('canvas');
          sprite.width = sprite.height = pixels;
          sprite.getContext('2d')?.drawImage(image, 0, 0, pixels, pixels);
          this.#sprites[unit] = { kind: 'raster', image: sprite, halfExtent };
        })
        .catch(() => undefined);
    }
  }
}
