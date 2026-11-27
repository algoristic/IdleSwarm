import { Component, computed, input } from '@angular/core';

import { FormatIntegerPipe } from '@app/shared/ui/pipes/format-integer/format-integer.pipe';
import { FormatNumberPipe } from '@app/shared/ui/pipes/format-number/format-number.pipe';

import { GameConfig } from '../../../domain/models/game-config.model';
import { NEURON_COLORS } from '../../art/art-palette';
import { UPGRADE_NAMES } from '../../texts/game-texts';
import { NeuronAxonComponent } from '../neuron-axon/neuron-axon.component';
import { NeuronDendriteComponent } from '../neuron-dendrite/neuron-dendrite.component';
import { NeuronLabelComponent } from '../neuron-label/neuron-label.component';
import { NeuronSomaComponent } from '../neuron-soma/neuron-soma.component';
import { NeuronPoint, SWARM_DENDRITE_IDS, SwarmNeuronView } from '../neuron.model';
import {
  FLAGELLA_NODE,
  myelinStates,
  reachMilestones,
  SWARM_AXON_PATH,
  SWARM_DENDRITES,
  TERMINAL_TWIG_PATH,
} from '../neuron.utils';
import { UpgradeNodeComponent } from '../upgrade-node/upgrade-node.component';

@Component({
  selector: 'g[app-swarm-neuron]',
  imports: [
    FormatIntegerPipe,
    FormatNumberPipe,
    NeuronAxonComponent,
    NeuronDendriteComponent,
    NeuronLabelComponent,
    NeuronSomaComponent,
    UpgradeNodeComponent,
  ],
  templateUrl: './swarm-neuron.component.html',
})
export class SwarmNeuronComponent {
  view = input.required<SwarmNeuronView>();
  config = input.required<GameConfig>();
  motion = input(true);

  colors = NEURON_COLORS;
  dendriteIds = SWARM_DENDRITE_IDS;
  dendrites = SWARM_DENDRITES;
  names = UPGRADE_NAMES;
  axonPath = SWARM_AXON_PATH;
  twigPath = TERMINAL_TWIG_PATH;
  flagellaTransform = `translate(${FLAGELLA_NODE[0]} ${FLAGELLA_NODE[1]})`;
  flagellaLabel: NeuronPoint = [34, 214];

  flagellaRank = computed(() => this.view().nodes.flagella.rank);
  myelin = computed(() => myelinStates(this.flagellaRank(), this.config().reach.every));
  milestones = computed(() => reachMilestones(this.config(), this.flagellaRank()));
}
