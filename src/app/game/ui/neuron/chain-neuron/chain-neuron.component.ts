import { Component, input } from '@angular/core';

import { NEURON_COLORS } from '../../art/art-palette';
import { UNIT_TEXTS } from '../../texts/game-texts';
import { ChainNodeComponent } from '../chain-node/chain-node.component';
import { NeuronAxonComponent } from '../neuron-axon/neuron-axon.component';
import { NeuronDendriteComponent } from '../neuron-dendrite/neuron-dendrite.component';
import { NeuronLabelComponent } from '../neuron-label/neuron-label.component';
import { NeuronSomaComponent } from '../neuron-soma/neuron-soma.component';
import { CHAIN_KEYS, ChainNeuronView } from '../neuron.model';
import { CHAIN_AXON_PATH, CHAIN_DENDRITES, CHAIN_NEURON_X } from '../neuron.utils';

@Component({
  selector: 'g[app-chain-neuron]',
  imports: [
    ChainNodeComponent,
    NeuronAxonComponent,
    NeuronDendriteComponent,
    NeuronLabelComponent,
    NeuronSomaComponent,
  ],
  templateUrl: './chain-neuron.component.html',
})
export class ChainNeuronComponent {
  view = input.required<ChainNeuronView>();
  motion = input(true);

  colors = NEURON_COLORS;
  keys = CHAIN_KEYS;
  dendrites = CHAIN_DENDRITES;
  unitTexts = UNIT_TEXTS;
  axonPath = CHAIN_AXON_PATH;
  neuronX = CHAIN_NEURON_X;
  somaTransform = `translate(${CHAIN_NEURON_X} 0)`;
}
