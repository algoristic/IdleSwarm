import { Component, input } from '@angular/core';

import { FormatIntegerPipe } from '@app/shared/ui/pipes/format-integer/format-integer.pipe';
import { FormatNumberPipe } from '@app/shared/ui/pipes/format-number/format-number.pipe';
import { TagDirective } from '@app/shared/ui/tag/tag.directive';

import { ContextBarDirective } from '../context-bar/context-bar.directive';
import { ZONE_NAMES } from '../texts/game-texts';
import { MapContextView } from './map-context.model';

@Component({
  selector: 'app-map-context',
  imports: [FormatIntegerPipe, FormatNumberPipe, TagDirective],
  templateUrl: './map-context.component.html',
  hostDirectives: [ContextBarDirective],
})
export class MapContextComponent {
  context = input.required<MapContextView>();

  zoneNames = ZONE_NAMES;
}
