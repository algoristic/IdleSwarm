import { Component, inject, input, linkedSignal } from '@angular/core';

import { FormatDownPipe } from '@app/shared/ui/pipes/format-down/format-down.pipe';

import { BuyButtonComponent } from '../../ui/buy-button/buy-button.component';
import { EventLogComponent } from '../../ui/event-log/event-log.component';
import { FeedingSiteComponent } from '../../ui/feeding-site/feeding-site.component';
import { FindsPanelComponent } from '../../ui/finds-panel/finds-panel.component';
import { FormSacrificeDronesComponent } from '../../ui/form-sacrifice-drones/form-sacrifice-drones.component';
import { HudMeterComponent } from '../../ui/hud-meter/hud-meter.component';
import { PheromonePanelComponent } from '../../ui/pheromone-panel/pheromone-panel.component';
import { HudFacade } from '../state/hud.facade';
import { HUD_DRAWERS, HudDrawer } from '../state/hud.model';

/**
 * Overlay der Szene (Mockup K2-K, nur im Modus `scene`): Titel mit Futterstelle bzw. Reise oben,
 * Aktionsleiste mit Kaufknöpfen und Platz unten, Schubladen Pheromone, Funde und Drohnen opfern am
 * rechten Rand, Log unten links, Ära unten rechts.
 */
@Component({
  selector: 'app-scene-hud',
  imports: [
    BuyButtonComponent,
    EventLogComponent,
    FeedingSiteComponent,
    FindsPanelComponent,
    FormSacrificeDronesComponent,
    FormatDownPipe,
    HudMeterComponent,
    PheromonePanelComponent,
  ],
  templateUrl: './scene-hud.component.html',
  styleUrl: './scene-hud.component.css',
  host: { class: 'block' },
})
export class SceneHudComponent {
  facade = inject(HudFacade);

  /** Ist die Szene der aktive Modus? Beim Wechsel schließt die offene Schublade (Mockup `setMode`). */
  active = input(false);

  drawers = HUD_DRAWERS;

  /** Höchstens eine Schublade ist offen; lokaler UI-Zustand, nie im Spielstand. */
  openDrawer = linkedSignal<boolean, HudDrawer | null>({
    source: this.active,
    computation: () => null,
  });

  spaceLabel = $localize`:@@featureHud-sceneHud-space-title:Platz`;
  drawerLabels: Readonly<Record<HudDrawer, string>> = {
    pheromones: $localize`:@@featureHud-sceneHud-drawer-pheromones:Pheromone`,
    finds: $localize`:@@featureHud-sceneHud-drawer-finds:Funde`,
    sacrifice: $localize`:@@featureHud-sceneHud-drawer-sacrifice:Drohnen opfern`,
  };

  onToggleDrawer(drawer: HudDrawer): void {
    this.openDrawer.update((open) => (open === drawer ? null : drawer));
  }

  /** Schließt die offene Schublade (Esc der Shell); `false`, wenn keine offen war. */
  closeDrawer(): boolean {
    if (this.openDrawer() === null) {
      return false;
    }
    this.openDrawer.set(null);
    return true;
  }
}
