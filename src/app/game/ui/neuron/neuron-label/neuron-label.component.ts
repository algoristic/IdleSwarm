import { Component, computed, input } from '@angular/core';

import { FormatNumberPipe } from '@app/shared/ui/pipes/format-number/format-number.pipe';

import { NEURON_COLORS } from '../../art/art-palette';
import { UNIT_TEXTS } from '../../texts/game-texts';
import { NeuronLabelAlign, NeuronPoint, NeuronTone, UpgradeCostView } from '../neuron.model';

@Component({
  selector: 'g[app-neuron-label]',
  imports: [FormatNumberPipe],
  templateUrl: './neuron-label.component.html',
})
export class NeuronLabelComponent {
  position = input.required<NeuronPoint>();
  name = input.required<string>();
  cost = input.required<UpgradeCostView>();
  affordable = input.required<boolean>();
  align = input<NeuronLabelAlign>('middle');
  tone = input<NeuronTone>('swarm');

  colors = NEURON_COLORS.label;
  unitTexts = UNIT_TEXTS;

  costY = computed(() => this.position()[1] + 15);
  costColor = computed(() => {
    if (this.tone() === 'chain') return this.colors.chainCost;
    return this.affordable() ? this.colors.cost : this.colors.costPoor;
  });
  unitName = computed(() => {
    const cost = this.cost();
    if (cost.kind !== 'units') return '';
    const texts = UNIT_TEXTS[cost.unit];
    return cost.amount === 1 ? texts.name : texts.plural;
  });
}
