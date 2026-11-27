import { Component, computed, input } from '@angular/core';

import { SOMA_COLORS, SomaTone } from '../../art/art-palette';
import { SOMA_PATH } from '../neuron.utils';

let nextClipId = 0;

@Component({
  selector: 'g[app-neuron-soma]',
  templateUrl: './neuron-soma.component.html',
})
export class NeuronSomaComponent {
  tone = input.required<SomaTone>();

  somaPath = SOMA_PATH;
  clipId = `app-neuron-soma-${nextClipId++}`;
  clipUrl = `url(#${this.clipId})`;

  colors = computed(() => SOMA_COLORS[this.tone()]);
}
