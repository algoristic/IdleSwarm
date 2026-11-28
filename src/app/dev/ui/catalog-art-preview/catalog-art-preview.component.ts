import { Component, computed, input } from '@angular/core';

import { UNIT_IDS } from '@app/game/domain/models/unit.model';
import { ZONE_IDS } from '@app/game/domain/models/zone.model';
import { SparkleSpriteComponent } from '@app/game/ui/art/sparkle-sprite/sparkle-sprite.component';
import { UnitIconComponent } from '@app/game/ui/art/unit-icon/unit-icon.component';
import { UnitSpriteComponent } from '@app/game/ui/art/unit-sprite/unit-sprite.component';
import { UNIT_SPRITE_HALF_EXTENT } from '@app/game/ui/art/unit-sprite/unit-sprite.model';
import { FarMoodComponent } from '@app/game/ui/scene/far-mood/far-mood.component';
import { SceneBackdropKind } from '@app/game/ui/scene/models/scene.model';
import { farMoodIndex } from '@app/game/ui/scene/mood.utils';
import { SceneBackdropComponent } from '@app/game/ui/scene/scene-backdrop/scene-backdrop.component';
import { SceneSiteComponent } from '@app/game/ui/scene/scene-site/scene-site.component';
import { SwarmCanvasComponent } from '@app/game/ui/scene/swarm-canvas/swarm-canvas.component';
import { ZoneHazeComponent } from '@app/game/ui/scene/zone-haze/zone-haze.component';
import { UNIT_TEXTS } from '@app/game/ui/texts/game-texts';

import { CatalogChoice } from '../../domain/data/catalog.data';
import { CatalogControls, CatalogEntryId } from '../../domain/models/catalog.model';
import { CatalogStageComponent } from '../catalog-stage/catalog-stage.component';

// Jeder Wert der game-Typen braucht eine Option im Katalog; die Gegenrichtung prüfen die Input-Bindungen.
type UncoveredOption = Exclude<SceneBackdropKind, CatalogChoice<'backdrop'>>;
const _OPTIONS_COVER_GAME: [UncoveredOption] extends [never] ? true : never = true;

@Component({
  selector: 'app-catalog-art-preview',
  imports: [
    CatalogStageComponent,
    FarMoodComponent,
    SceneBackdropComponent,
    SceneSiteComponent,
    SparkleSpriteComponent,
    SwarmCanvasComponent,
    UnitIconComponent,
    UnitSpriteComponent,
    ZoneHazeComponent,
  ],
  templateUrl: './catalog-art-preview.component.html',
  host: { class: 'block' },
})
export class CatalogArtPreviewComponent {
  entry = input.required<CatalogEntryId>();
  controls = input.required<CatalogControls>();

  sceneViewBox = '-450 -450 900 900';
  farViewBox = '-1000 -1000 2000 2000';
  sparkleViewBox = '-18 -18 36 36';
  sprites = UNIT_IDS.map((unit) => {
    const h = UNIT_SPRITE_HALF_EXTENT[unit];
    return { unit, name: UNIT_TEXTS[unit].name, viewBox: `${-h} ${-h} ${2 * h} ${2 * h}` };
  });
  shape = 4242;

  hazeMood = computed(() => farMoodIndex(this.controls().zone, ZONE_IDS.length));
}
