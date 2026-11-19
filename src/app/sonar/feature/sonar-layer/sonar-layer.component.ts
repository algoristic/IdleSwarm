import { Component, inject } from '@angular/core';

import { SonarMapComponent } from '../../ui/sonar-map/sonar-map.component';
import { SonarFacade } from '../state/sonar.facade';

/** Karten-Ebene der Shell: die Sonar-Karte in der Größe `--ms`, zentriert auf die eigene Position. */
@Component({
  selector: 'app-sonar-layer',
  imports: [SonarMapComponent],
  templateUrl: './sonar-layer.component.html',
  styleUrl: './sonar-layer.component.css',
  host: { class: 'block' },
})
export class SonarLayerComponent {
  facade = inject(SonarFacade);
}
