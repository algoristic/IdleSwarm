import type { ShellMode } from '@app/shell/domain/models/shell-mode.model';

import type { HintId } from '../../domain/models/onboarding.model';

/**
 * Modus, in dem ein Hinweis erscheint (US-09.04): `auto-move` beim ersten Öffnen der Umgebung, alle
 * anderen in der Szene, wo ihr Teil (Aktionsleiste, Schubladen, Zoom-Leiste) zu sehen ist. Im
 * Genom erscheint keiner.
 */
export const HINT_MODES: Readonly<Record<HintId, ShellMode>> = {
  collect: 'scene',
  pheromones: 'scene',
  map: 'scene',
  finds: 'scene',
  genome: 'scene',
  'auto-move': 'map',
};

/** Der erste offene Hinweis, der zum Modus passt; höchstens einer zur Zeit. */
export function hintForMode(pending: readonly HintId[], mode: ShellMode): HintId | null {
  return pending.find((hint) => HINT_MODES[hint] === mode) ?? null;
}
