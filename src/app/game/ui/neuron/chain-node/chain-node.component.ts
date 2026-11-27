import { Component, computed, input } from '@angular/core';

import { FormatIntegerPipe } from '@app/shared/ui/pipes/format-integer/format-integer.pipe';

import { NEURON_COLORS } from '../../art/art-palette';
import { UnitSpriteComponent } from '../../art/unit-sprite/unit-sprite.component';
import { CHAIN_ICON_SCALE } from '../../art/unit-sprite/unit-sprite.model';
import { ChainKey } from '../neuron.model';

@Component({
  selector: 'g[app-chain-node]',
  imports: [FormatIntegerPipe, UnitSpriteComponent],
  templateUrl: './chain-node.component.html',
  styleUrl: './chain-node.component.css',
})
export class ChainNodeComponent {
  unit = input.required<ChainKey>();
  rank = input.required<number>();
  affordable = input.required<boolean>();
  locked = input(false);
  selected = input(false);
  motion = input(true);

  colors = NEURON_COLORS.chainNode;
  selectionColor = NEURON_COLORS.node.selection;

  iconTransform = computed(() => `scale(${CHAIN_ICON_SCALE[this.unit()]})`);
}
