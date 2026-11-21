import {
  afterNextRender,
  Component,
  computed,
  DOCUMENT,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  viewChild,
  viewChildren,
} from '@angular/core';

import { FormatDownPipe } from '@app/shared/ui/pipes/format-down/format-down.pipe';

import { BuyButtonComponent } from '../../ui/buy-button/buy-button.component';
import { EventLogComponent } from '../../ui/event-log/event-log.component';
import { FeedingSiteComponent } from '../../ui/feeding-site/feeding-site.component';
import { FindsPanelComponent } from '../../ui/finds-panel/finds-panel.component';
import { FormSacrificeDronesComponent } from '../../ui/form-sacrifice-drones/form-sacrifice-drones.component';
import { HudMeterComponent } from '../../ui/hud-meter/hud-meter.component';
import { PheromonePanelComponent } from '../../ui/pheromone-panel/pheromone-panel.component';
import { HudFacade } from '../state/hud.facade';
import type { HudDrawer } from '../state/hud.model';

/**
 * Overlay der Szene (Mockup K2-K, nur im Modus `scene`): Titel mit Futterstelle bzw. Reise oben,
 * Aktionsleiste mit Kaufknöpfen und Platz unten, Schubladen Pheromone, Funde und Drohnen opfern am
 * rechten Rand, Log unten links, Ära unten rechts. Gesperrte Teile (Soldat, Schubladen) fehlen, bis
 * sie freigeschaltet sind (US-09.04).
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
  readonly #document = inject(DOCUMENT);
  readonly #injector = inject(Injector);

  /** Ist die Szene der aktive Modus? Beim Wechsel schließt die offene Schublade (Mockup `setMode`). */
  active = input(false);

  title = viewChild.required<string, ElementRef<HTMLElement>>('title', { read: ElementRef });
  /** Schubladen und Reiter in der Reihenfolge der freigeschalteten Schubladen (`hud.drawers`). */
  drawerPanels = viewChildren<ElementRef<HTMLElement>>('drawerPanel');
  drawerTabs = viewChildren<ElementRef<HTMLElement>>('drawerTab');

  /** Höchstens eine Schublade ist offen; lokaler UI-Zustand, nie im Spielstand. */
  openDrawer = linkedSignal<boolean, HudDrawer | null>({
    source: this.active,
    computation: () => null,
  });

  /** Spalten der Aktionsleiste auf dem Smartphone und im Querformat: eine je freigeschalteter Einheit. */
  barColumns = computed(() =>
    this.facade.hud().units.length === 3
      ? 'max-md:grid-cols-3 short:grid-cols-3'
      : 'max-md:grid-cols-2 short:grid-cols-2',
  );

  titleLabel = $localize`:@@featureHud-sceneHud-titleRegion:Schwarm`;
  spaceLabel = $localize`:@@featureHud-sceneHud-space-title:Platz`;
  drawerLabels: Readonly<Record<HudDrawer, string>> = {
    pheromones: $localize`:@@featureHud-sceneHud-drawer-pheromones:Pheromone`,
    finds: $localize`:@@featureHud-sceneHud-drawer-finds:Funde`,
    sacrifice: $localize`:@@featureHud-sceneHud-drawer-sacrifice:Drohnen opfern`,
  };

  /**
   * Öffnet die Schublade und setzt den Fokus hinein (TK §8.5); erneuter Klick schließt sie, der Fokus
   * bleibt dann auf dem Reiter.
   */
  onToggleDrawer(drawer: HudDrawer): void {
    if (this.openDrawer() === drawer) {
      this.closeDrawer();
      return;
    }
    this.openDrawer.set(drawer);
    // Erst nach dem Rendern ist die Schublade sichtbar und nicht mehr inert.
    afterNextRender(
      () => this.#drawerElement(this.drawerPanels(), drawer)?.focus({ preventScroll: true }),
      {
        injector: this.#injector,
      },
    );
  }

  /**
   * Schließt die offene Schublade (Esc der Shell); `false`, wenn keine offen war. Lag der Fokus in
   * ihr, kehrt er auf ihren Reiter zurück, statt mit der inerten Schublade verloren zu gehen.
   */
  closeDrawer(): boolean {
    const open = this.openDrawer();
    if (open === null) {
      return false;
    }
    const panel = this.#drawerElement(this.drawerPanels(), open);
    if (panel?.contains(this.#document.activeElement)) {
      this.#drawerElement(this.drawerTabs(), open)?.focus();
    }
    this.openDrawer.set(null);
    return true;
  }

  /** Fokus auf den Titel nach einem Moduswechsel (TK §8.5); die Shell ruft das auf. */
  focusTitle(): void {
    this.title().nativeElement.focus({ preventScroll: true });
  }

  #drawerElement(
    elements: readonly ElementRef<HTMLElement>[],
    drawer: HudDrawer,
  ): HTMLElement | undefined {
    return elements[this.facade.hud().drawers.indexOf(drawer)]?.nativeElement;
  }
}
