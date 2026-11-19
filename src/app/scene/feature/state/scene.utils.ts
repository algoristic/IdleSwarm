import type { BalanceParams } from '@app/balance/domain/constants';
import { foodPerSecond } from '@app/balance/domain/formulas';
import type { LogEntry } from '@app/engine/data-access/game-store/game-store-service.model';
import { stateModifiers } from '@app/engine/domain/modifiers-logic';

import type { SceneFrame } from '../../domain/models/scene.model';
import { spriteBudget, spriteCounts, unitCounts } from '../../domain/scene-budget-logic';
import { yieldParticleRate } from '../../domain/scene-effects-logic';
import { scenePixelRatio } from '../../domain/scene-geometry-logic';
import { SCENE_POPUP_SLOTS, type SceneSource, type ScenePopupView } from './scene.model';

/** Höchstens so viele Ereigniszahlen stehen gleichzeitig über der Szene. */
export const SCENE_POPUP_MAX = 3;

export function toSceneFrame(source: SceneSource, params: BalanceParams): SceneFrame {
  const { state } = source;
  const { site } = state;
  const traveling = state.travel !== null;
  const budget = spriteBudget(source.width, source.coarsePointer);
  const rate = traveling
    ? 0
    : foodPerSecond(state.units, site.stock, params, stateModifiers(state, params)).toNumber();
  return {
    width: source.width,
    height: source.height,
    pixelRatio: scenePixelRatio(source.devicePixelRatio),
    sprites: spriteCounts(unitCounts(state.units), budget),
    traveling,
    stockShare: site.size.isZero() ? 0 : site.stock.div(site.size).toNumber(),
    yieldParticleRate: yieldParticleRate(rate, source.reducedMotion),
    reducedMotion: source.reducedMotion,
  };
}

/**
 * Ereigniszahlen aus Log-Einträgen nach `afterId` (Einträge vor dem Start der Szene erscheinen
 * nicht): Einnahme mit DNA und Fund. Nur die neuesten `SCENE_POPUP_MAX`; ältere sind dann längst
 * ausgeblendet.
 */
export function toScenePopups(log: readonly LogEntry[], afterId: number): ScenePopupView[] {
  const popups: ScenePopupView[] = [];
  for (const { id, event } of log) {
    if (id <= afterId) {
      continue;
    }
    const slot = SCENE_POPUP_SLOTS[id % SCENE_POPUP_SLOTS.length];
    if (event.type === 'arrived' && event.dna.gt(0)) {
      popups.push({ id, dna: event.dna, slot });
    } else if (event.type === 'found') {
      popups.push({ id, dna: null, slot });
    }
  }
  return popups.slice(-SCENE_POPUP_MAX);
}
