import { Component, input } from '@angular/core';

import { FormatIntegerPipe } from '@app/shared/ui/pipes/format-integer/format-integer.pipe';

import { CatchUpOverlayView } from './catch-up-overlay.model';

@Component({
  selector: 'app-catch-up-overlay',
  imports: [FormatIntegerPipe],
  templateUrl: './catch-up-overlay.component.html',
  host: { class: 'grid place-items-center bg-bg/85 font-black' },
})
export class CatchUpOverlayComponent {
  overlay = input.required<CatchUpOverlayView>();
}
