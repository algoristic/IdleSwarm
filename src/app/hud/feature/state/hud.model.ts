import type { GameState } from '@app/engine/domain/models/game-state.model';
import type { RestoreNotice } from '@app/persistence/data-access/persistence/persistence-service.model';
import type { SaveError } from '@app/persistence/domain/serialize-logic';
import type { Num } from '@app/shared/util/num/num';

import type { UnitView } from '../../ui/buy-button/buy-button.component.model';
import type { SiteView } from '../../ui/feeding-site/feeding-site.component.model';
import type { SacrificeView } from '../../ui/form-sacrifice-drones/form-sacrifice-drones.component.model';

/** Was das HUD aus dem Spielkern liest; die Facade setzt es aus Store und Persistenz zusammen. */
export interface HudSource {
  readonly state: GameState;
  readonly notice: RestoreNotice | null;
  readonly lastSaveError: SaveError | null;
  readonly lastSavedAt: number | null;
}

/** Hinweise in der Fußzeile; die Seite bildet sie auf Texte ab. */
export type HudNotice = RestoreNotice | 'save-failed';

export interface SpaceView {
  readonly used: Num;
  readonly available: Num;
  /** Echter Wert, auch über 100 %; `null` ohne verfügbaren Platz. */
  readonly usagePercent: Num | null;
  /** Füllstand des Balkens von 0 bis 100. */
  readonly barPercent: number;
  readonly warning: boolean;
  /** Belegt mehr als verfügbar: Beim Weiterziehen bleiben Einheiten zurück (Game-Design §4.11). */
  readonly overfull: boolean;
}

export interface HudView {
  readonly food: Num;
  readonly dna: Num;
  readonly foodRate: Num;
  readonly baseRate: Num;
  readonly droneRate: Num;
  readonly eggsPerMinute: Num;
  readonly attack: Num;
  readonly site: SiteView;
  readonly space: SpaceView;
  /** In der Reihenfolge der Aktionsleiste. */
  readonly units: readonly UnitView[];
  readonly sacrifice: SacrificeView;
  /** Zeitpunkt des letzten Speicherns; `null` ohne Speichern oder bei ungültigem Wert. */
  readonly lastSavedAt: number | null;
  readonly notices: readonly HudNotice[];
}
