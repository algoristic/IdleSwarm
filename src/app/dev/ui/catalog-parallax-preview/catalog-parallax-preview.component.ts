import { Component, computed, input, signal } from '@angular/core';

import { ZONE_IDS } from '@app/game/domain/models/zone.model';
import { MapCurrentSiteComponent } from '@app/game/ui/map/map-current-site/map-current-site.component';
import { MapSiteComponent } from '@app/game/ui/map/map-site/map-site.component';
import { MapWaterComponent } from '@app/game/ui/map/map-water/map-water.component';
import { REACH_PX } from '@app/game/ui/map/map.model';
import { FarMoodComponent } from '@app/game/ui/scene/far-mood/far-mood.component';
import { farMoodIndex } from '@app/game/ui/scene/mood.utils';
import { ZoneHazeComponent } from '@app/game/ui/scene/zone-haze/zone-haze.component';

import { CatalogControls } from '../../domain/models/catalog.model';
import { CatalogStageComponent } from '../catalog-stage/catalog-stage.component';
import { clampPan, ParallaxPan, parallaxLayers } from './catalog-parallax-preview.utils';

const FRAME = 640;

interface DragStart {
  pointerX: number;
  pointerY: number;
  pan: ParallaxPan;
  scale: number;
}

@Component({
  selector: 'app-catalog-parallax-preview',
  imports: [
    CatalogStageComponent,
    FarMoodComponent,
    MapCurrentSiteComponent,
    MapSiteComponent,
    MapWaterComponent,
    ZoneHazeComponent,
  ],
  templateUrl: './catalog-parallax-preview.component.html',
  host: { class: 'block' },
})
export class CatalogParallaxPreviewComponent {
  controls = input.required<CatalogControls>();

  frame = FRAME;
  layerViewBox = '-1000 -1000 2000 2000';
  sites = [
    { id: 'algae', type: 'algae', shape: 4242, transform: 'translate(150 -70)' },
    { id: 'plankton', type: 'plankton', shape: 13, transform: 'translate(-130 110)' },
    { id: 'seagrass', type: 'seagrass', shape: 271828, transform: 'translate(40 190)' },
  ] as const;

  pan = signal<ParallaxPan>({ x: 0, y: 0 });
  dragging = signal(false);
  #dragStart: DragStart | null = null;

  mood = computed(() => farMoodIndex(this.controls().zone, ZONE_IDS.length));
  layers = computed(() => parallaxLayers(this.pan(), this.controls().blur));
  layerClasses = computed(() =>
    this.dragging()
      ? 'absolute top-80 left-80 origin-top-left'
      : 'absolute top-80 left-80 origin-top-left transition duration-300 ease-out',
  );

  onPointerDown(event: PointerEvent): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;
    target.setPointerCapture(event.pointerId);
    this.#dragStart = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      pan: this.pan(),
      scale: target.getBoundingClientRect().width / FRAME || 1,
    };
    this.dragging.set(true);
  }

  onPointerMove(event: PointerEvent): void {
    const start = this.#dragStart;
    if (!start) return;
    const dx = (event.clientX - start.pointerX) / start.scale;
    const dy = (event.clientY - start.pointerY) / start.scale;
    this.pan.set(clampPan(start.pan.x + dx, start.pan.y + dy, REACH_PX));
  }

  onPointerUp(): void {
    this.#dragStart = null;
    this.dragging.set(false);
  }

  onReset(): void {
    this.pan.set({ x: 0, y: 0 });
  }
}
