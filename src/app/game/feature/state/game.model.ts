import { CatchUpOverlayView } from '../../ui/catch-up-overlay/catch-up-overlay.model';
import { ChipView } from '../../ui/chips/chips.model';
import { GameToast } from '../../ui/game-toast/game-toast.model';
import { HudView } from '../../ui/hud/hud.model';
import { MapContextView } from '../../ui/map-context/map-context.model';
import { SwarmContextView } from '../../ui/swarm-context/swarm-context.model';
import { UpgradesContextView } from '../../ui/upgrades-context/upgrades-context.model';

export const GAME_VIEWS = ['swarm', 'map', 'upgrades'] as const;
export type GameViewId = (typeof GAME_VIEWS)[number];

export interface GameView {
  hud: HudView;
  swarm: SwarmContextView;
  map: MapContextView;
  upgrades: UpgradesContextView;
  chips: ChipView[];
  catchUp: CatchUpOverlayView | null;
}

export type CollapsedSheets = Record<GameViewId, boolean>;

export interface ToastQueue {
  visible: readonly GameToast[];
  lastSeenId: number;
}
