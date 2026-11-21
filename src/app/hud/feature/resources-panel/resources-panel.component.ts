import { Component, inject } from '@angular/core';

import { FormatDownPipe } from '@app/shared/ui/pipes/format-down/format-down.pipe';
import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';
import { FormatRatePipe } from '@app/shared/ui/pipes/format-rate/format-rate.pipe';

import { HudFacade } from '../state/hud.facade';

/**
 * Ressourcen, die die Shell in allen Modi zeigt (US-08.03): Nahrung mit Rate, DNA, Pheromone,
 * Eier/min, Aufschlüsselung der Rate und Gesamtangriff. Das Panel setzt die Shell darum.
 */
@Component({
  selector: 'app-resources-panel',
  imports: [FormatDownPipe, FormatNumPipe, FormatRatePipe],
  templateUrl: './resources-panel.component.html',
  styleUrl: './resources-panel.component.css',
  host: { class: 'block' },
})
export class ResourcesPanelComponent {
  facade = inject(HudFacade);
}
