import { Component, computed, input } from '@angular/core';

import { GameConfig } from '@app/game/domain/models/game-config.model';
import { NEURON_COLORS, SomaTone } from '@app/game/ui/art/art-palette';
import { ChainNeuronComponent } from '@app/game/ui/neuron/chain-neuron/chain-neuron.component';
import { ChainNodeComponent } from '@app/game/ui/neuron/chain-node/chain-node.component';
import { NeuronBackdropComponent } from '@app/game/ui/neuron/neuron-backdrop/neuron-backdrop.component';
import { NeuronSomaComponent } from '@app/game/ui/neuron/neuron-soma/neuron-soma.component';
import { ChainKey } from '@app/game/ui/neuron/neuron.model';
import { NEURON_VIEW_BOX } from '@app/game/ui/neuron/neuron.utils';
import { SwarmNeuronComponent } from '@app/game/ui/neuron/swarm-neuron/swarm-neuron.component';
import { UpgradeNodeComponent } from '@app/game/ui/neuron/upgrade-node/upgrade-node.component';

import { CatalogChoice } from '../../domain/data/catalog.data';
import { CatalogControls, CatalogEntryId } from '../../domain/models/catalog.model';
import {
  sampleChainNeuronView,
  sampleChainNodeView,
  sampleSwarmNeuronView,
} from './catalog-neuron-preview.utils';

// Jeder Wert der game-Typen braucht eine Option im Katalog; die Gegenrichtung prüfen die Input-Bindungen.
type UncoveredOption =
  Exclude<SomaTone, CatalogChoice<'tone'>> | Exclude<ChainKey, CatalogChoice<'chainUnit'>>;
const _OPTIONS_COVER_GAME: [UncoveredOption] extends [never] ? true : never = true;

@Component({
  selector: 'app-catalog-neuron-preview',
  imports: [
    ChainNeuronComponent,
    ChainNodeComponent,
    NeuronBackdropComponent,
    NeuronSomaComponent,
    SwarmNeuronComponent,
    UpgradeNodeComponent,
  ],
  templateUrl: './catalog-neuron-preview.component.html',
  host: { class: 'block' },
})
export class CatalogNeuronPreviewComponent {
  entry = input.required<CatalogEntryId>();
  controls = input.required<CatalogControls>();
  config = input.required<GameConfig>();

  background = NEURON_COLORS.background.base;
  fullViewBox = NEURON_VIEW_BOX;
  swarmViewBox = '-250 -250 500 510';
  pairViewBox = '-250 -260 960 520';
  chainViewBox = '40 -280 660 600';
  somaViewBox = '-100 -100 200 200';
  nodeViewBox = '-48 -48 96 96';

  swarmView = computed(() =>
    sampleSwarmNeuronView(this.controls().rank, this.controls().upgradeState),
  );
  chainView = computed(() =>
    sampleChainNeuronView(this.controls().rank, this.controls().chainState),
  );
  chainNode = computed(() => {
    const c = this.controls();
    return sampleChainNodeView(c.chainUnit, c.rank, c.chainState);
  });
}
