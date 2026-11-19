import { Component, computed, input, output } from '@angular/core';

import { FormatDownPipe } from '@app/shared/ui/pipes/format-down/format-down.pipe';
import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';
import { formatRate } from '@app/shared/util/format/format';
import { SITE_TYPE_LABELS } from '@app/site/ui/site-type-labels/site-type-labels';

import type { TargetView } from '../models/target.model';
import { VERDICT_FILLS, VERDICT_LABELS, VERDICT_STROKES } from '../sonar-labels/sonar-labels';
import type { MapNodeView, SonarMapView } from './sonar-map.component.model';

interface MapNodeItem {
  readonly node: MapNodeView;
  readonly ariaLabel: string;
}

/**
 * Sonar-Karte im K2-Stil (US-04.12): Distanzringe, Reichweite, bisherige Route und Ziele farbig
 * nach Urteil. Jedes Ziel ist ein Knopf; die Auswahl teilt sie mit der Zielliste.
 */
@Component({
  selector: 'app-sonar-map',
  imports: [FormatDownPipe, FormatNumPipe],
  templateUrl: './sonar-map.component.html',
  styleUrl: './sonar-map.component.css',
  host: { class: 'block' },
})
export class SonarMapComponent {
  map = input.required<SonarMapView>();

  siteTypeLabels = SITE_TYPE_LABELS;
  verdictFills = VERDICT_FILLS;
  verdictStrokes = VERDICT_STROKES;

  selectedTarget = output<number>();

  nodes = computed<readonly MapNodeItem[]>(() =>
    this.map().nodes.map((node) => ({ node, ariaLabel: this.#ariaLabel(node.target) })),
  );

  title = $localize`:@@uiSonar-sonarMap-title:Sonar-Karte der Umgebung`;
  strategyMark = $localize`:@@uiSonar-sonarMap-strategyChoice:Strategie wählt dieses Ziel`;

  onSelect(index: number): void {
    this.selectedTarget.emit(index);
  }

  onKeySelect(event: Event, index: number): void {
    // Leertaste würde sonst die Seite scrollen.
    event.preventDefault();
    this.selectedTarget.emit(index);
  }

  #ariaLabel(target: TargetView): string {
    const verdict = VERDICT_LABELS[target.verdict];
    const base =
      target.details === null
        ? $localize`:@@uiSonar-sonarMap-targetUnexplored:Unerforschtes Ziel: ${verdict}:verdict:`
        : $localize`:@@uiSonar-sonarMap-target:${SITE_TYPE_LABELS[target.details.type]}:type:, Distanz ${formatRate(target.details.distance)}:distance:: ${verdict}:verdict:`;
    return target.strategyChoice ? `${base}. ${this.strategyMark}` : base;
  }
}
