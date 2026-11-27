import { Component, computed, input } from '@angular/core';

import { UnitId } from '../../../domain/models/unit.model';
import { LOCKED_UNIT_ICON_COLORS } from '../art-palette';
import { UnitSpriteComponent } from '../unit-sprite/unit-sprite.component';
import { UnitIconVariant } from './unit-icon.model';
import { LOCKED_UNIT_ICON_FRAME, unitIconFrame } from './unit-icon.utils';

const HOST_CLASSES: Record<UnitIconVariant, string> = {
  list: 'block',
  tab: 'relative top-0.75 inline-block',
};

@Component({
  selector: 'app-unit-icon',
  imports: [UnitSpriteComponent],
  templateUrl: './unit-icon.component.html',
  host: { '[class]': 'hostClasses()', 'aria-hidden': 'true' },
})
export class UnitIconComponent {
  unit = input<UnitId | null>(null);
  variant = input<UnitIconVariant>('list');

  lockedColors = LOCKED_UNIT_ICON_COLORS;
  lockedMark = '?';

  frame = computed(() => {
    const unit = this.unit();
    return unit ? unitIconFrame(unit, this.variant()) : LOCKED_UNIT_ICON_FRAME;
  });
  hostClasses = computed(() => (this.unit() ? HOST_CLASSES[this.variant()] : HOST_CLASSES.list));
}
