import type { GameState } from '@app/engine/domain/models/game-state.model';
import type { Num } from '@app/shared/util/num/num';

import type { MoveSettingsView } from '../../ui/form-move-settings/form-move-settings.component.model';
import type { CurrentSiteView, TravelView } from '../../ui/models/site-status.model';
import type { QueenConversionView, TargetView, TransportView } from '../../ui/models/target.model';
import type { SonarMapView } from '../../ui/sonar-map/sonar-map.component.model';

/** Was die Umgebung liest; `selected` ist lokaler UI-Zustand der Facade, nicht im Spielstand. */
export interface SonarSource {
  readonly state: GameState;
  /** Vom Spieler gewähltes Ziel (Index in `map.candidates`); `null` folgt der Strategie. */
  readonly selected: number | null;
}

export interface SonarView {
  readonly site: CurrentSiteView;
  readonly range: number;
  /** `null`, solange der Schwarm nicht unterwegs ist. */
  readonly travel: TravelView | null;
  /** In der Reihenfolge der Kandidatenliste. */
  readonly targets: readonly TargetView[];
  /** Ziel im Detailpanel: die Wahl des Spielers, sonst das Ziel der Strategie. */
  readonly selected: TargetView | null;
  /** Index des Ziels der gewählten Strategie; `null`, wenn sie keines findet oder während der Reise. */
  readonly strategyTarget: number | null;
  /** `null` während der Reise: Nach der Ankunft gilt eine neue Vorschau. */
  readonly transport: TransportView | null;
  readonly queen: QueenConversionView;
  /** Restvorrat, der beim Aufbruch verfällt; `null` ohne Rest oder während der Reise. */
  readonly forfeitedStock: Num | null;
  readonly settings: MoveSettingsView;
  /** Sonar-Karte: Zentrum ist die aktuelle Position, während der Reise noch der Ausgangsort. */
  readonly map: SonarMapView;
}
