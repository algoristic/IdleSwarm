import { afterRenderEffect, Component, inject, viewChild } from '@angular/core';

import { GenomeLayerComponent } from '@app/genome/feature/genome-layer/genome-layer.component';
import { GenomeOverlayComponent } from '@app/genome/feature/genome-overlay/genome-overlay.component';
import { ResourcesPanelComponent } from '@app/hud/feature/resources-panel/resources-panel.component';
import { ReturnSummaryComponent } from '@app/hud/feature/return-summary/return-summary.component';
import { SaveStatusComponent } from '@app/hud/feature/save-status/save-status.component';
import { SceneHudComponent } from '@app/hud/feature/scene-hud/scene-hud.component';
import { HudFacade } from '@app/hud/feature/state/hud.facade';
import { SceneWorldComponent } from '@app/scene/feature/scene-world/scene-world.component';
import { SonarLayerComponent } from '@app/sonar/feature/sonar-layer/sonar-layer.component';
import { SonarOverlayComponent } from '@app/sonar/feature/sonar-overlay/sonar-overlay.component';

import type { ShellMode } from '../../domain/models/shell-mode.model';
import { ZoomBarComponent } from '../../ui/zoom-bar/zoom-bar.component';
import { ShellInputDirective } from '../shell-input/shell-input.directive';
import { ShellFacade } from '../state/shell.facade';

/**
 * K2-Shell (US-08.01): drei Ebenen (Sonar z = 1, Welt z = 2, Genom z = 3) mit Kamerafahrt je
 * Modus, darüber die vollflächigen Overlays der Modi, Logo mit Ressourcen und Speicherstatus,
 * Zoom-Leiste und „zurück zum Schwarm“, dazu der Dialog „Willkommen zurück“. Setzt die Ebenen und Overlays von Szene, HUD, Sonar und
 * Genom zusammen.
 */
@Component({
  selector: 'app-shell-page',
  imports: [
    GenomeLayerComponent,
    GenomeOverlayComponent,
    ResourcesPanelComponent,
    ReturnSummaryComponent,
    SaveStatusComponent,
    SceneHudComponent,
    SceneWorldComponent,
    ShellInputDirective,
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

  sceneHud = viewChild.required(SceneHudComponent);
  sonarOverlay = viewChild.required(SonarOverlayComponent);
  genomeOverlay = viewChild.required(GenomeOverlayComponent);

  worldBackLabel = $localize`:@@featureShell-shell-worldBack:Zurück zum Schwarm`;

  /** Zuletzt gerenderter Modus; `null` bis zum ersten Rendern. */
  #renderedMode: ShellMode | null = null;

  constructor() {
    // Fokusführung (TK §8.5): Nach jedem Moduswechsel (Zoom-Leiste, Zurück, Tasten, Rad, Pinch,
    // Links, Verlauf) wandert der Fokus auf den Titel des neuen Modus, nicht beim ersten Laden. Erst
    // nach dem Rendern, denn vorher ist das Overlay noch inert.
    afterRenderEffect(() => {
      const mode = this.facade.mode();
      if (this.#renderedMode !== null && this.#renderedMode !== mode) {
        this.#focusTitle(mode);
      }
      this.#renderedMode = mode;
    });
  }

  onClickWorld(): void {
    this.facade.setMode('scene');
  }

  /** Esc schließt in der Szene zuerst die offene Schublade, sonst führt es zum Schwarm. */
  onShortcut(mode: ShellMode): void {
    if (mode === 'scene' && this.sceneHud().closeDrawer()) {
      return;
    }
    this.facade.setMode(mode);
  }

  #focusTitle(mode: ShellMode): void {
    const overlays = {
      scene: this.sceneHud(),
      map: this.sonarOverlay(),
      gen: this.genomeOverlay(),
    } satisfies Record<ShellMode, { focusTitle(): void }>;
    overlays[mode].focusTitle();
  }
}
