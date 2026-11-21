import { Component, computed, inject, input, output } from '@angular/core';

import { NUMBER_NOTATION } from '@app/shared/ui/pipes/number-notation/number-notation.token';
import { formatDown } from '@app/shared/util/format/display-format';
import { FormatOptions, formatNum, formatRate } from '@app/shared/util/format/format';
import { SITE_TYPE_LABELS } from '@app/site/ui/site-type-labels/site-type-labels';

import type { TargetView } from '../models/target.model';
import { VERDICT_FILLS, VERDICT_LABELS, VERDICT_STROKES } from '../sonar-labels/sonar-labels';
import type { MapNodeView, SonarMapView } from './sonar-map.component.model';
import { layoutSonarMap, type MapNodeLayout, type SonarMapLayout } from './sonar-map.layout';

interface MapNodeItem {
  readonly node: MapNodeView;
  readonly layout: MapNodeLayout;
  readonly name: string | null;
  readonly dna: string | null;
  readonly ariaLabel: string;
}

/**
 * Sonar-Karte im K2-Stil (US-04.12): Distanzringe, Reichweite, bisherige Route und Ziele farbig
 * nach Urteil. Jedes Ziel ist ein Knopf; die Auswahl teilt sie mit der Zielliste.
 */
@Component({
  selector: 'app-sonar-map',
  templateUrl: './sonar-map.component.html',
  styleUrl: './sonar-map.component.css',
  host: { class: 'block' },
})
export class SonarMapComponent {
  readonly #notation = inject(NUMBER_NOTATION);

  map = input.required<SonarMapView>();
  /** Gerenderte Pixel je `viewBox`-Einheit; die Ebene misst sie, ohne Messung gilt 1. */
  scale = input(1);

  verdictFills = VERDICT_FILLS;
  verdictStrokes = VERDICT_STROKES;

  selectedTarget = output<number>();

  #names = computed(() =>
    this.map().nodes.map(({ target }) =>
      target.details === null ? null : SITE_TYPE_LABELS[target.details.type],
    ),
  );

  /** Zahlenformat der Beschriftungen; wie die Pipes aus `NUMBER_NOTATION`. */
  #format = computed(() => ({ notation: this.#notation() }));

  #dnaLabels = computed(() => {
    const format = this.#format();
    return this.map().nodes.map(({ target }) =>
      target.details?.rewardsDna
        ? $localize`:@@uiSonar-sonarMap-dna:+${formatDown(target.details.dna, format)}:dna: DNA`
        : null,
    );
  });

  ringLabels = computed(() => {
    const format = this.#format();
    return this.map().rings.map((ring) => formatNum(ring.distance, format));
  });

  rangeLabel = computed(
    () =>
      $localize`:@@uiSonar-sonarMap-range:${formatNum(this.map().range.value, this.#format())}:range: · Reichweite`,
  );

  hereLabel = computed(() => {
    const _map = this.map();
    const type = SITE_TYPE_LABELS[_map.here.type];
    return _map.travel
      ? $localize`:@@uiSonar-sonarMap-left:${type}:type: (verlassen)`
      : $localize`:@@uiSonar-sonarMap-here:${type}:type: (hier)`;
  });

  layout = computed<SonarMapLayout>(() =>
    layoutSonarMap(this.map(), this.scale(), {
      names: this.#names(),
      dna: this.#dnaLabels(),
      rings: this.ringLabels(),
      range: this.rangeLabel(),
      here: this.hereLabel(),
    }),
  );

  nodes = computed<readonly MapNodeItem[]>(() => {
    const format = this.#format();
    const names = this.#names();
    const dna = this.#dnaLabels();
    const layouts = this.layout().nodes;
    return this.map().nodes.map((node, i) => ({
      node,
      layout: layouts[i],
      name: names[i],
      dna: dna[i],
      ariaLabel: this.#ariaLabel(node.target, format),
    }));
  });

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

  #ariaLabel(target: TargetView, format: FormatOptions): string {
    const verdict = VERDICT_LABELS[target.verdict];
    const base =
      target.details === null
        ? $localize`:@@uiSonar-sonarMap-targetUnexplored:Unerforschtes Ziel: ${verdict}:verdict:`
        : $localize`:@@uiSonar-sonarMap-target:${SITE_TYPE_LABELS[target.details.type]}:type:, Distanz ${formatRate(target.details.distance, format)}:distance:: ${verdict}:verdict:`;
    return target.strategyChoice ? `${base}. ${this.strategyMark}` : base;
  }
}
