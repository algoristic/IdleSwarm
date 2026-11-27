import { Component, computed, input } from '@angular/core';

import { NEURON_COLORS } from '../../art/art-palette';
import { BACKDROP_TWIG_PATHS, CHAIN_NEURON_X, neuronOrganelles } from '../neuron.utils';

let nextFilterId = 0;

@Component({
  selector: 'g[app-neuron-backdrop]',
  templateUrl: './neuron-backdrop.component.html',
})
export class NeuronBackdropComponent {
  showChain = input.required<boolean>();

  colors = NEURON_COLORS;
  haloRadii = [640, 470, 320, 190];
  haloCenters = [0, CHAIN_NEURON_X];
  twigPaths = BACKDROP_TWIG_PATHS;
  filterId = `app-neuron-backdrop-blur-${nextFilterId++}`;
  filterUrl = `url(#${this.filterId})`;

  organelles = computed(() => neuronOrganelles(this.showChain()));
}
