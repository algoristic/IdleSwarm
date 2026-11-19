import { Component, inject } from '@angular/core';

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
 * Karte) und die Einstellungen zum Weiterziehen.
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
  host: { class: 'block' },
})
export class SonarOverlayComponent {
  facade = inject(SonarFacade);
}
