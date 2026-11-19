import { Component, inject } from '@angular/core';

import { GenomeLayerComponent } from '@app/genome/feature/genome-layer/genome-layer.component';
import { GenomeOverlayComponent } from '@app/genome/feature/genome-overlay/genome-overlay.component';
import { ResourcesPanelComponent } from '@app/hud/feature/resources-panel/resources-panel.component';
import { SceneHudComponent } from '@app/hud/feature/scene-hud/scene-hud.component';
import { HudFacade } from '@app/hud/feature/state/hud.facade';
import { SonarLayerComponent } from '@app/sonar/feature/sonar-layer/sonar-layer.component';
import { SonarOverlayComponent } from '@app/sonar/feature/sonar-overlay/sonar-overlay.component';

import { ZoomBarComponent } from '../../ui/zoom-bar/zoom-bar.component';
import { ShellFacade } from '../state/shell.facade';

/**
 * K2-Shell (US-08.01): drei Ebenen (Sonar z = 1, Welt z = 2, Genom z = 3) mit Kamerafahrt je
 * Modus, darüber die Overlays der Modi, Ressourcen, Zoom-Leiste und „zurück zum Schwarm“. Setzt die
 * Ebenen und Overlays von HUD, Sonar und Genom zusammen.
 */
@Component({
  selector: 'app-shell-page',
  imports: [
    GenomeLayerComponent,
    GenomeOverlayComponent,
    ResourcesPanelComponent,
    SceneHudComponent,
    SonarLayerComponent,
    SonarOverlayComponent,
    ZoomBarComponent,
  ],
  templateUrl: './shell.page.html',
  styleUrl: './shell.page.css',
  host: { class: 'block' },
})
export class ShellPage {
  facade = inject(ShellFacade);
  hudFacade = inject(HudFacade);

  worldBackLabel = $localize`:@@featureShell-shell-worldBack:Zurück zum Schwarm`;

  onClickWorld(): void {
    this.facade.setMode('scene');
  }
}
