import type { GameState } from '@app/engine/domain/models/game-state.model';
import type { OnboardingUnlockId } from '@app/onboarding/domain/models/onboarding.model';
import type { RestoreNotice } from '@app/persistence/data-access/persistence/persistence-service.model';
import type { SaveError } from '@app/persistence/domain/serialize-logic';
import type { Notation } from '@app/shared/util/format/format';
import type { Num } from '@app/shared/util/num/num';

import type { UnitView } from '../../ui/buy-button/buy-button.component.model';
import type { SiteView } from '../../ui/feeding-site/feeding-site.component.model';
import type { FindsView } from '../../ui/finds-panel/finds-panel.component.model';
import type { SacrificeView } from '../../ui/form-sacrifice-drones/form-sacrifice-drones.component.model';
import type { PheromoneView } from '../../ui/pheromone-panel/pheromone-panel.component.model';

/** Was das HUD aus dem Spielkern liest; die Facade setzt es aus Store und Persistenz zusammen. */
export interface HudSource {
  readonly state: GameState;
  readonly notice: RestoreNotice | null;
  readonly lastSaveError: SaveError | null;
  readonly lastSavedAt: number | null;
  /** Zahlenformat der Anzeige; die Preise werden auf dessen Stellen gerundet. Standard: Kurzformen. */
  readonly notation?: Notation;
}

/** Schubladen am rechten Rand der Szene (Mockup `.tabs`); lokaler UI-Zustand, nie im Spielstand. */
export const HUD_DRAWERS = ['pheromones', 'finds', 'sacrifice'] as const;
export type HudDrawer = (typeof HUD_DRAWERS)[number];

/** Freigeschaltete Teile (US-09.04); gesperrte blendet das HUD aus. */
export type HudUnlocks = Readonly<Record<OnboardingUnlockId, boolean>>;

/** Hinweise unter den Ressourcen; `SaveStatusComponent` bildet sie auf Texte ab. */
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
  readonly unlocks: HudUnlocks;
  /** Freigeschaltete Einheiten in der Reihenfolge der Aktionsleiste (Soldat erst mit `map`). */
  readonly units: readonly UnitView[];
  /** Freigeschaltete Schubladen in der Reihenfolge von {@link HUD_DRAWERS}. */
  readonly drawers: readonly HudDrawer[];
  readonly sacrifice: SacrificeView;
  readonly pheromones: PheromoneView;
  readonly finds: FindsView;
  /** Bezahlbare Adaptionen für den Zähler am Genom-Link (US-05.04). */
  readonly availableAdaptations: number;
  /** Zeitpunkt des letzten Speicherns; `null` ohne Speichern oder bei ungültigem Wert. */
  readonly lastSavedAt: number | null;
  readonly notices: readonly HudNotice[];
}
