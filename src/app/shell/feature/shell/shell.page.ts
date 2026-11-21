import {
  afterNextRender,
  afterRenderEffect,
  Component,
  computed,
  effect,
  inject,
  Injector,
  viewChild,
} from '@angular/core';

import { GenomeLayerComponent } from '@app/genome/feature/genome-layer/genome-layer.component';
import { GenomeOverlayComponent } from '@app/genome/feature/genome-overlay/genome-overlay.component';
import { ResourcesPanelComponent } from '@app/hud/feature/resources-panel/resources-panel.component';
import { ReturnSummaryComponent } from '@app/hud/feature/return-summary/return-summary.component';
import { SaveStatusComponent } from '@app/hud/feature/save-status/save-status.component';
import { SceneHudComponent } from '@app/hud/feature/scene-hud/scene-hud.component';
import { HudFacade } from '@app/hud/feature/state/hud.facade';
import { OnboardingHintComponent } from '@app/onboarding/feature/onboarding-hint/onboarding-hint.component';
import { SceneWorldComponent } from '@app/scene/feature/scene-world/scene-world.component';
import { SettingsDialogComponent } from '@app/settings/feature/settings-dialog/settings-dialog.component';
import { SettingsFacade } from '@app/settings/feature/state/settings.facade';
import { SettingsButtonComponent } from '@app/settings/ui/settings-button/settings-button.component';
import { SonarLayerComponent } from '@app/sonar/feature/sonar-layer/sonar-layer.component';
import { SonarOverlayComponent } from '@app/sonar/feature/sonar-overlay/sonar-overlay.component';

import type { ShellMode } from '../../domain/models/shell-mode.model';
import { ZoomBarComponent } from '../../ui/zoom-bar/zoom-bar.component';
import { ShellInputDirective } from '../shell-input/shell-input.directive';
import { ShellFacade } from '../state/shell.facade';

/**
 * K2-Shell (US-08.01): drei Ebenen (Sonar z = 1, Welt z = 2, Genom z = 3) mit Kamerafahrt je
 * Modus, darüber die vollflächigen Overlays der Modi, Logo mit Ressourcen und Speicherstatus,
 * Zoom-Leiste, Hinweise des Onboardings, „zurück zum Schwarm“ und Zahnrad, dazu die Dialoge
 * „Willkommen zurück“ und „Einstellungen“. Setzt die Ebenen und Overlays von Szene, HUD, Sonar und Genom zusammen.
 */
@Component({
  selector: 'app-shell-page',
  imports: [
    GenomeLayerComponent,
    GenomeOverlayComponent,
    OnboardingHintComponent,
    ResourcesPanelComponent,
    ReturnSummaryComponent,
    SaveStatusComponent,
    SceneHudComponent,
    SceneWorldComponent,
    SettingsButtonComponent,
    SettingsDialogComponent,
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
  settingsFacade = inject(SettingsFacade);
  readonly #injector = inject(Injector);

  sceneHud = viewChild.required(SceneHudComponent);
  sonarOverlay = viewChild.required(SonarOverlayComponent);
  genomeOverlay = viewChild.required(GenomeOverlayComponent);

  /**
   * Auf dem Smartphone liegt der Hinweis mittig; eine offene Schublade bzw. das aufgeklappte Sheet
   * der Umgebung reicht dorthin, dann tritt er zurück.
   */
  hintCovered = computed(() => {
    const mode = this.facade.mode();
    return (
      (mode === 'scene' && this.sceneHud().openDrawer() !== null) ||
      (mode === 'map' && this.sonarOverlay().sheetOpen())
    );
  });

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
    // Ein neues Spiel oder ein Import kann den aktuellen Modus wieder sperren: zurück zur Szene.
    effect(() => {
      if (!this.facade.isModeUnlocked(this.facade.mode())) {
        this.facade.setMode('scene');
      }
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

  /** Der Knopf „Verstanden“ verschwindet mit dem Hinweis; der Fokus geht auf den Titel des Modus. */
  onHintReleasedFocus(): void {
    this.#focusTitle(this.facade.mode());
  }

  /**
   * Der Rückkehr-Dialog verschwindet nach dem Quittieren aus dem DOM; der Fokus geht auf den Titel
   * des Modus. Erst nach dem Rendern, solange der modale Dialog offen ist, ist die Seite inert.
   */
  onReturnAcknowledged(): void {
    afterNextRender(() => this.#focusTitle(this.facade.mode()), { injector: this.#injector });
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
