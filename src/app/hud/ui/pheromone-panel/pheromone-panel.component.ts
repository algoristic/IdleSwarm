import { Component, input, output } from '@angular/core';

import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';
import { FormatRatePipe } from '@app/shared/ui/pipes/format-rate/format-rate.pipe';

import type {
  PheromoneDistribution,
  PheromoneUnit,
  PheromoneView,
} from './pheromone-panel.component.model';

/**
 * Pheromone (US-03.01–03.03): Punkte je Einheitentyp mit +/−, Verteilung als geteilter Balken,
 * freie Punkte und Kauf eines Drüsenpunkts mit seiner Wirkung auf die Eier/min.
 */
@Component({
  selector: 'app-pheromone-panel',
  imports: [FormatNumPipe, FormatRatePipe],
  templateUrl: './pheromone-panel.component.html',
  host: { class: 'block' },
})
export class PheromonePanelComponent {
  pheromones = input.required<PheromoneView>();

  changedPheromones = output<PheromoneDistribution>();
  clickedStrengthenGland = output<void>();

  unitLabels: Readonly<Record<PheromoneUnit, string>> = {
    drones: $localize`:@@uiHud-pheromonePanel-unit-drones:Drohnen`,
    soldiers: $localize`:@@uiHud-pheromonePanel-unit-soldiers:Soldaten`,
  };
  increaseLabels: Readonly<Record<PheromoneUnit, string>> = {
    drones: $localize`:@@uiHud-pheromonePanel-increase-drones:Einen Punkt mehr auf Drohnen`,
    soldiers: $localize`:@@uiHud-pheromonePanel-increase-soldiers:Einen Punkt mehr auf Soldaten`,
  };
  decreaseLabels: Readonly<Record<PheromoneUnit, string>> = {
    drones: $localize`:@@uiHud-pheromonePanel-decrease-drones:Einen Punkt weniger auf Drohnen`,
    soldiers: $localize`:@@uiHud-pheromonePanel-decrease-soldiers:Einen Punkt weniger auf Soldaten`,
  };

  onChangePheromones(distribution: PheromoneDistribution | null): void {
    if (distribution !== null) {
      this.changedPheromones.emit(distribution);
    }
  }

  onStrengthenGland(): void {
    this.clickedStrengthenGland.emit();
  }
}
