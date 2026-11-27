import { CatchUpProgress } from '../../data-access/catch-up/catch-up-service.model';
import { GameEventEntry } from '../../data-access/game-store/game-store-service.model';
import { derive } from '../../domain/derive-logic';
import { activeBuffs } from '../../domain/find-logic';
import { foodFillPercent, harvestThrottlePercent } from '../../domain/harvest-logic';
import { DerivedValues } from '../../domain/models/derived-values.model';
import { GameConfig } from '../../domain/models/game-config.model';
import { GameEvent } from '../../domain/models/game-event.model';
import { GameState } from '../../domain/models/game-state.model';
import { LoadOutcome } from '../../domain/models/save.model';
import { TravelTarget } from '../../domain/models/travel.model';
import { currentSite, siteFillShare, timeUntilEmpty } from '../../domain/site-logic';
import {
  bestAlternative,
  markTarget,
  travelDestination,
  travelProgress,
  travelRemainingTime,
} from '../../domain/travel-logic';
import { affordableUpgradeCount, upgradeCount } from '../../domain/upgrade-logic';
import { nextZone } from '../../domain/zone-logic';
import { CatchUpOverlayView } from '../../ui/catch-up-overlay/catch-up-overlay.model';
import { ChipView } from '../../ui/chips/chips.model';
import { GameToast, GameToastMessage } from '../../ui/game-toast/game-toast.model';
import { HarvestNote, HudView } from '../../ui/hud/hud.model';
import { MapContextView } from '../../ui/map-context/map-context.model';
import {
  SiteNote,
  SwarmContextView,
  SwarmPlace,
  SwarmTag,
  TargetName,
} from '../../ui/swarm-context/swarm-context.model';
import { GAME_VIEWS, GameView, GameViewId, ToastQueue } from './game.model';

export const MAX_VISIBLE_TOASTS = 2;
export const START_TOAST_ID = 0;
export const EMPTY_TOAST_QUEUE: ToastQueue = { visible: [], lastSeenId: -1 };

export function toGameView(
  config: GameConfig,
  state: GameState,
  tempo: number,
  catchUpProgress: CatchUpProgress | null,
): GameView {
  const derived = derive(config, state);
  return {
    hud: toHud(state, derived),
    swarm: toSwarmContext(config, state, derived),
    map: toMapContext(config, state, derived),
    upgrades: {
      affordable: affordableUpgradeCount(config, state),
      total: upgradeCount(config),
    },
    chips: toChips(config, state, derived, tempo),
    catchUp: toCatchUpOverlay(catchUpProgress),
  };
}

export function advanceToastQueue(queue: ToastQueue, candidates: readonly GameToast[]): ToastQueue {
  const unseen = candidates.filter((toast) => toast.id > queue.lastSeenId);
  if (unseen.length === 0) return queue;
  return {
    visible: [...queue.visible, ...unseen].slice(-MAX_VISIBLE_TOASTS),
    lastSeenId: Math.max(queue.lastSeenId, ...unseen.map((toast) => toast.id)),
  };
}

export function removeToast(queue: ToastQueue, id: number): ToastQueue {
  return { ...queue, visible: queue.visible.filter((toast) => toast.id !== id) };
}

export function isGameView(value: unknown): value is GameViewId {
  return GAME_VIEWS.some((view) => view === value);
}

function toHud(state: GameState, derived: DerivedValues): HudView {
  return {
    food: state.food,
    capacity: derived.capacity,
    foodFill: foodFillPercent(state.food, derived.capacity) / 100,
    foodOver: state.food > derived.capacity,
    eggs: state.eggs,
    eggRate: derived.eggRate,
    harvestRate: state.travel ? 0 : state.lastHarvestRate,
    harvestNote: toHarvestNote(state, derived),
  };
}

function toHarvestNote(state: GameState, derived: DerivedValues): HarvestNote {
  if (state.travel) return { kind: 'travelling' };
  const percent = harvestThrottlePercent(state.food, derived.capacity);
  return percent === null ? { kind: 'perSecond' } : { kind: 'throttled', percent };
}

function toSwarmContext(
  config: GameConfig,
  state: GameState,
  derived: DerivedValues,
): SwarmContextView {
  return { place: toSwarmPlace(config, state, derived), tag: toSwarmTag(config, state, derived) };
}

function toSwarmPlace(config: GameConfig, state: GameState, derived: DerivedValues): SwarmPlace {
  if (state.travel) {
    const destination = travelDestination(state);
    return {
      kind: 'travelling',
      destination: destination ? toTargetName(destination) : null,
      remaining: travelRemainingTime(state.travel, derived.speed),
      progress: travelProgress(state.travel),
    };
  }
  const site = currentSite(state);
  if (!site) return { kind: 'none' };
  let note: SiteNote;
  if (site.dead) note = { kind: 'dried' };
  else if (state.lastHarvestRate > 0)
    note = config.siteTypes[site.type].goal
      ? { kind: 'average', rate: state.lastHarvestRate }
      : { kind: 'emptyIn', seconds: timeUntilEmpty(config, site, state.lastHarvestRate) };
  else note = { kind: 'noHarvest' };
  return { kind: 'site', siteType: site.type, fill: siteFillShare(site), note };
}

function toSwarmTag(config: GameConfig, state: GameState, derived: DerivedValues): SwarmTag {
  const mark = markTarget(config, state, derived);
  if (mark) return { kind: 'mark', target: toTargetName(mark) };
  if (state.travel) return { kind: 'none' };
  const alternative = bestAlternative(config, state, derived);
  return alternative ? { kind: 'alternative', siteType: alternative.site.type } : { kind: 'none' };
}

function toTargetName(target: TravelTarget): TargetName {
  return target.kind === 'site'
    ? { kind: 'site', siteType: target.site.type }
    : { kind: 'find', findType: target.find.type };
}

function toMapContext(
  config: GameConfig,
  state: GameState,
  derived: DerivedValues,
): MapContextView {
  return { zone: state.zone, zoneId: config.zones[state.zone].id, speed: derived.speed };
}

function toChips(
  config: GameConfig,
  state: GameState,
  derived: DerivedValues,
  tempo: number,
): ChipView[] {
  const chips: ChipView[] = [];
  const next = nextZone(config, state, derived.thrust);
  if (next) chips.push({ id: 'zone', kind: 'zone', ...next });
  for (const buff of activeBuffs(state))
    chips.push({ id: `buff-${buff}`, kind: 'buff', buff, remaining: state.buffs[buff] });
  if (state.freeUpgrades > 0)
    chips.push({ id: 'freeUpgrades', kind: 'freeUpgrades', count: state.freeUpgrades });
  if (tempo !== 1) chips.push({ id: 'tempo', kind: 'tempo', tempo });
  return chips;
}

function toCatchUpOverlay(progress: CatchUpProgress | null): CatchUpOverlayView | null {
  if (!progress) return null;
  return {
    percent: progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : null,
  };
}

export function toastCandidates(
  config: GameConfig,
  loadOutcome: LoadOutcome,
  events: readonly GameEventEntry[],
): GameToast[] {
  const toasts: GameToast[] = [];
  const start = startToastMessage(loadOutcome);
  if (start) toasts.push({ id: START_TOAST_ID, message: start });
  for (const entry of events) {
    const message = eventToastMessage(config, entry.event);
    if (message) toasts.push({ id: entry.id, message });
  }
  return toasts;
}

function startToastMessage(loadOutcome: LoadOutcome): GameToastMessage | null {
  switch (loadOutcome) {
    case 'fresh':
      return { kind: 'welcome' };
    case 'reset':
      return { kind: 'saveReset' };
    case 'loaded':
      return null;
  }
}

function eventToastMessage(config: GameConfig, event: GameEvent): GameToastMessage | null {
  switch (event.type) {
    case 'findCollected':
      return { kind: 'findCollected', findType: event.findType };
    case 'zoneChanged':
      return {
        kind: 'zoneChanged',
        from: config.zones[event.from].id,
        to: config.zones[event.to].id,
      };
    case 'travelAborted':
    case 'unmarked':
    case 'noTarget':
      return { kind: event.type };
    default:
      return null;
  }
}
