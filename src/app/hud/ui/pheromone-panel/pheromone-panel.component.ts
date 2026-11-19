import { Component, computed, input, output } from '@angular/core';

import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';
import { FormatRatePipe } from '@app/shared/ui/pipes/format-rate/format-rate.pipe';

import type {
  PheromoneDistribution,
  PheromoneUnit,
  PheromoneView,
} from './pheromone-panel.component.model';

const PIP_EMPTY_CLASSES = 'size-3.5 rounded-full bg-well';
const PIP_FILLED_CLASSES: Readonly<Record<PheromoneUnit, string>> = {
  drones: 'size-3.5 rounded-full bg-unit-drone inset-shadow-shade',
  soldiers: 'size-3.5 rounded-full bg-unit-soldier inset-shadow-shade',
};

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

  /**
   * Je Typ so viele Pips, wie Punkte insgesamt da sind; gefüllt sind die verteilten (Mockup
   * `.pips`). Jeder Pip trägt seine vollständigen Klassen.
   */
  pipRows = computed(() => {
    const { rows, total } = this.pheromones();
    return rows.map((row) => ({
      ...row,
      pips: Array.from({ length: Math.max(total, row.points) }, (_, index) =>
        index < row.points ? PIP_FILLED_CLASSES[row.id] : PIP_EMPTY_CLASSES,
      ),
    }));
  });

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
