import { Component, input } from '@angular/core';

import { FormatIntegerPipe } from '@app/shared/ui/pipes/format-integer/format-integer.pipe';

import { NEURON_COLORS } from '../../art/art-palette';

let nextClipId = 0;

@Component({
  selector: 'g[app-upgrade-node]',
  imports: [FormatIntegerPipe],
  templateUrl: './upgrade-node.component.html',
  styleUrl: './upgrade-node.component.css',
})
export class UpgradeNodeComponent {
  rank = input.required<number>();
  affordable = input.required<boolean>();
  selected = input(false);
  motion = input(true);

  colors = NEURON_COLORS.node;
  clipId = `app-upgrade-node-${nextClipId++}`;
  clipUrl = `url(#${this.clipId})`;
}
