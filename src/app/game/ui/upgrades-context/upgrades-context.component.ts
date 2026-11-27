import { Component, input } from '@angular/core';

import { FormatIntegerPipe } from '@app/shared/ui/pipes/format-integer/format-integer.pipe';

import { ContextBarDirective } from '../context-bar/context-bar.directive';
import { UpgradesContextView } from './upgrades-context.model';

@Component({
  selector: 'app-upgrades-context',
  imports: [FormatIntegerPipe],
  templateUrl: './upgrades-context.component.html',
  hostDirectives: [ContextBarDirective],
})
export class UpgradesContextComponent {
  context = input.required<UpgradesContextView>();
}
