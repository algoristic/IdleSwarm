import { Component, computed, input } from '@angular/core';

import { SiteTypeId } from '../../../domain/models/site.model';
import { SCENE_COLORS } from '../../art/art-palette';
import { CARCASS_LEGS_PATH, sceneSite, sceneSiteScale } from '../scene-site.utils';

@Component({
  selector: 'g[app-scene-site]',
  templateUrl: './scene-site.component.html',
})
export class SceneSiteComponent {
  type = input.required<SiteTypeId>();
  shape = input.required<number>();
  fillFraction = input.required<number>();

  legsPath = CARCASS_LEGS_PATH;
  legsColor = SCENE_COLORS.carcassLegs;

  site = computed(() => sceneSite(this.type(), this.shape()));
  transform = computed(() => `scale(${sceneSiteScale(this.fillFraction())})`);
}
