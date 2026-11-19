import { Component, inject } from '@angular/core';

import { FormatDownPipe } from '@app/shared/ui/pipes/format-down/format-down.pipe';
import { FormatRatePipe } from '@app/shared/ui/pipes/format-rate/format-rate.pipe';

import { HudFacade } from '../state/hud.facade';

/** Ressourcen-Panel, das die Shell in allen Modi zeigt (US-08.03): Mengen, Raten und Angriff. */
@Component({
  selector: 'app-resources-panel',
  imports: [FormatDownPipe, FormatRatePipe],
  templateUrl: './resources-panel.component.html',
  host: { class: 'block' },
})
export class ResourcesPanelComponent {
  facade = inject(HudFacade);
}
