import { Component, computed, input } from '@angular/core';

import { NEURON_COLORS } from '../../art/art-palette';
import { NeuronTone } from '../neuron.model';

const AXON_STYLES: Record<NeuronTone, { stroke: string; glow: string; glowWidth: number }> = {
  swarm: { ...NEURON_COLORS.axon, glowWidth: 26 },
  chain: {
    stroke: NEURON_COLORS.chainDendrite.stroke,
    glow: NEURON_COLORS.chainDendrite.glow,
    glowWidth: 30,
  },
};

@Component({
  selector: 'g[app-neuron-axon]',
  templateUrl: './neuron-axon.component.html',
  styleUrl: './neuron-axon.component.css',
})
export class NeuronAxonComponent {
  path = input.required<string>();
  tone = input<NeuronTone>('swarm');
  motion = input(true);

  signalColor = NEURON_COLORS.signal;

  styles = computed(() => AXON_STYLES[this.tone()]);
}
