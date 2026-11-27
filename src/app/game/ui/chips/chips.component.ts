import { Component, input } from '@angular/core';

import { FormatIntegerPipe } from '@app/shared/ui/pipes/format-integer/format-integer.pipe';
import { FormatNumberPipe } from '@app/shared/ui/pipes/format-number/format-number.pipe';
import { FormatTimePipe } from '@app/shared/ui/pipes/format-time/format-time.pipe';

import { FIND_NAMES } from '../texts/game-texts';
import { ChipView } from './chips.model';

@Component({
  selector: 'app-chips',
  imports: [FormatIntegerPipe, FormatNumberPipe, FormatTimePipe],
  templateUrl: './chips.component.html',
  host: { class: 'pointer-events-none flex flex-wrap gap-1.25' },
})
export class ChipsComponent {
  chips = input.required<ChipView[]>();

  findNames = FIND_NAMES;
}
