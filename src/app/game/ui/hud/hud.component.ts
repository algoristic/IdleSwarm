import { Component, input } from '@angular/core';

import { PillComponent } from '@app/shared/ui/pill/pill.component';
import { FormatIntegerPipe } from '@app/shared/ui/pipes/format-integer/format-integer.pipe';
import { FormatNumberPipe } from '@app/shared/ui/pipes/format-number/format-number.pipe';

import { HudView } from './hud.model';

@Component({
  selector: 'app-hud',
  imports: [FormatIntegerPipe, FormatNumberPipe, PillComponent],
  templateUrl: './hud.component.html',
  styleUrl: './hud.component.css',
  host: { class: 'block' },
})
export class HudComponent {
  hud = input.required<HudView>();
}
