import { Component, DestroyRef, inject } from '@angular/core';

import type { SimError } from '../../data-access/sim/sim-service.model';
import { FormModelParamsComponent } from '../../ui/form-model-params/form-model-params.component';
import { ModelChartsComponent } from '../../ui/model-charts/model-charts.component';
import { ModelMetricsComponent } from '../../ui/model-metrics/model-metrics.component';
import { ModelFacade } from '../state/model.facade';

/** Modell-Seite (US-10.01 bis 10.05): Bot-Läufe im Worker, Diagramme und Kennzahlen. */
@Component({
  selector: 'app-model-page',
  imports: [FormModelParamsComponent, ModelChartsComponent, ModelMetricsComponent],
  templateUrl: './model.page.html',
  host: { class: 'block' },
})
export class ModelPage {
  facade = inject(ModelFacade);

  errorTexts: Readonly<Record<SimError['code'], string>> = {
    'run-failed': $localize`:@@featureModel-model-error-runFailed:Simulation fehlgeschlagen`,
    'worker-crashed': $localize`:@@featureModel-model-error-workerCrashed:Der Worker ist abgestürzt.`,
    'worker-unreadable': $localize`:@@featureModel-model-error-workerUnreadable:Die Antwort des Workers war nicht lesbar.`,
  };

  constructor() {
    // Ein Lauf gehört zur Seite; beim Verlassen wird der Worker beendet.
    inject(DestroyRef).onDestroy(() => this.facade.stop());
  }
}
