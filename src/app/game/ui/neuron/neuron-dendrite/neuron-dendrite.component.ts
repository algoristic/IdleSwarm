import { Component, computed, input } from '@angular/core';

import { NEURON_COLORS } from '../../art/art-palette';
import { DendriteGeometry, NeuronTone } from '../neuron.model';
import { beadPositions, dendritePath } from '../neuron.utils';

const DENDRITE_COLORS: Record<NeuronTone, { stroke: string; glow: string; core: string }> = {
  swarm: NEURON_COLORS.dendrite,
  chain: NEURON_COLORS.chainDendrite,
};

@Component({
  selector: 'g[app-neuron-dendrite]',
  templateUrl: './neuron-dendrite.component.html',
  styleUrl: './neuron-dendrite.component.css',
})
export class NeuronDendriteComponent {
  geometry = input.required<DendriteGeometry>();
  rank = input.required<number>();
  tone = input<NeuronTone>('swarm');
  locked = input(false);
  motion = input(true);

  signalColor = NEURON_COLORS.signal;
  beadColors = NEURON_COLORS.bead;
  lockedColor = NEURON_COLORS.chainDendrite.locked;

  colors = computed(() => DENDRITE_COLORS[this.tone()]);
  path = computed(() => dendritePath(this.geometry()));
  beads = computed(() => beadPositions(this.geometry(), this.rank()));
}
