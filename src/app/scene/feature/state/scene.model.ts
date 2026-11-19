import type { GameState } from '@app/engine/domain/models/game-state.model';
import type { Num } from '@app/shared/util/num/num';

/** Was die Szene je Frame aus Spielkern, Viewport und Gerät liest. */
export interface SceneSource {
  readonly state: GameState;
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio: number;
  readonly coarsePointer: boolean;
  readonly reduceParticles: boolean;
}

/** Horizontale Lage einer Ereigniszahl über der Futterstelle, damit sich Zahlen nicht verdecken. */
export const SCENE_POPUP_SLOTS = [0, 1, 2] as const;
export type ScenePopupSlot = (typeof SCENE_POPUP_SLOTS)[number];

/** Ereigniszahl über der Szene: „+x DNA“ bei einer Einnahme, „Fund!“ bei einem Fund (`dna` `null`). */
export interface ScenePopupView {
  readonly id: number;
  readonly dna: Num | null;
  readonly slot: ScenePopupSlot;
}
