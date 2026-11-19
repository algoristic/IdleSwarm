import { Component, inject, input, linkedSignal } from '@angular/core';

import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';

import { FormMoveSettingsComponent } from '../../ui/form-move-settings/form-move-settings.component';
import { MoveNoteComponent } from '../../ui/move-note/move-note.component';
import { SonarTitleComponent } from '../../ui/sonar-title/sonar-title.component';
import { TargetDetailComponent } from '../../ui/target-detail/target-detail.component';
import { TargetListComponent } from '../../ui/target-list/target-list.component';
import { SonarFacade } from '../state/sonar.facade';

/**
 * Overlay des Kartenmodus (Mockup K2-K): Titel oben Mitte mit Standort, Strategie und Legende;
 * rechts das Detailpanel mit Notiz, darunter einklappbar die Zielliste (tippbare Alternative zur
 * Karte) und die Einstellungen zum Weiterziehen. Auf dem Smartphone (< 768 px) ist der Titel
 * kompakt unter der Moduszeile und das Detailpanel ein Bottom-Sheet mit ein-/ausklappbarem Kopf.
 */
@Component({
  selector: 'app-sonar-overlay',
  imports: [
    FormatNumPipe,
    FormMoveSettingsComponent,
    MoveNoteComponent,
    SonarTitleComponent,
    TargetDetailComponent,
    TargetListComponent,
  ],
  templateUrl: './sonar-overlay.component.html',
  styleUrl: './sonar-overlay.component.css',
  host: { class: 'block' },
})
export class SonarOverlayComponent {
  facade = inject(SonarFacade);

  /** Kartenmodus aktiv; beim Wechsel klappt das Bottom-Sheet wieder ein (wie die Schubladen). */
  active = input(true);

  /** Bottom-Sheet aufgeklappt; lokaler UI-Zustand, auf größeren Bildschirmen ohne Wirkung. */
  sheetOpen = linkedSignal({ source: this.active, computation: () => false });

  onToggleSheet(): void {
    this.sheetOpen.update((open) => !open);
  }
}
