import { GameEventEntry } from '../../data-access/game-store/game-store-service.model';
import { GameEvent } from '../../domain/models/game-event.model';
import { GameState } from '../../domain/models/game-state.model';
import { LoadOutcome } from '../../domain/models/save.model';
import { Site, SiteTypeId } from '../../domain/models/site.model';
import { newGame } from '../../domain/new-game-logic';
import { PROTOTYPE_GAME_CONFIG } from '../../domain/prototype-game-config.fixture';
import { GameToast } from '../../ui/game-toast/game-toast.model';
import { ToastQueue } from './game.model';
import {
  advanceToastQueue,
  EMPTY_TOAST_QUEUE,
  removeToast,
  toastCandidates,
  toGameView,
} from './game.utils';

const config = PROTOTYPE_GAME_CONFIG;

function entries(...events: GameEvent[]): GameEventEntry[] {
  return events.map((event, index) => ({ id: index + 1, event }));
}

function site(id: number, type: SiteTypeId, overrides: Partial<Site> = {}): Site {
  return {
    id,
    type,
    zone: 0,
    x: id * 50,
    y: 0,
    size: 1000,
    stock: 400,
    bornAt: 0,
    dead: false,
    removeAt: null,
    discovered: true,
    shape: 1,
    ...overrides,
  };
}

function state(overrides: Partial<GameState> = {}): GameState {
  return {
    ...newGame(config, 4242, 0),
    position: { x: 50, y: 0 },
    sites: [site(1, 'algae'), site(2, 'carcass')],
    finds: [],
    siteId: 1,
    travel: null,
    mark: null,
    food: 100,
    lastHarvestRate: 0,
    ...overrides,
  };
}

function arrivals(fromId: number, toId: number): GameEventEntry[] {
  const log: GameEventEntry[] = [];
  for (let id = fromId; id <= toId; id++) log.push({ id, event: { type: 'arrived', siteId: 1 } });
  return log;
}

function follow(
  queue: ToastQueue,
  loadOutcome: LoadOutcome,
  log: readonly GameEventEntry[],
): ToastQueue {
  return advanceToastQueue(queue, toastCandidates(config, loadOutcome, log));
}

function ids(queue: ToastQueue): number[] {
  return queue.visible.map((toast) => toast.id);
}

describe('toastCandidates', () => {
  it('liefert den Start-Toast je nach Ergebnis des Ladens', () => {
    expect(toastCandidates(config, 'fresh', [])).toEqual([{ id: 0, message: { kind: 'welcome' } }]);
    expect(toastCandidates(config, 'reset', [])).toEqual([
      { id: 0, message: { kind: 'saveReset' } },
    ]);
    expect(toastCandidates(config, 'loaded', [])).toEqual([]);
  });

  it('übergeht Ereignisse ohne Toast', () => {
    const log = entries(
      { type: 'siteDried', siteId: 1, siteType: 'algae' },
      { type: 'departed', kind: 'site', targetId: 2 },
      { type: 'arrived', siteId: 2 },
      { type: 'ended' },
    );

    expect(toastCandidates(config, 'loaded', log)).toEqual([]);
  });

  it('bildet die Ereignisse mit Toast auf Codes ab', () => {
    const log = entries(
      { type: 'findCollected', findId: 7, findType: 'tailwind' },
      { type: 'zoneChanged', from: 0, to: 1 },
      { type: 'travelAborted' },
      { type: 'unmarked' },
      { type: 'noTarget' },
    );

    expect(toastCandidates(config, 'loaded', log)).toEqual<GameToast[]>([
      { id: 1, message: { kind: 'findCollected', findType: 'tailwind' } },
      { id: 2, message: { kind: 'zoneChanged', from: 'droplet', to: 'tidePool' } },
      { id: 3, message: { kind: 'travelAborted' } },
      { id: 4, message: { kind: 'unmarked' } },
      { id: 5, message: { kind: 'noTarget' } },
    ]);
  });
});

describe('advanceToastQueue', () => {
  it('zeigt höchstens die zwei neuesten Toasts', () => {
    const log = entries({ type: 'unmarked' }, { type: 'arrived', siteId: 2 }, { type: 'noTarget' });

    expect(ids(follow(EMPTY_TOAST_QUEUE, 'fresh', log))).toEqual([1, 3]);
  });

  it('holt einen abgelaufenen Toast nicht zurück', () => {
    const log = entries({ type: 'unmarked' }, { type: 'noTarget' });
    const shown = follow(EMPTY_TOAST_QUEUE, 'loaded', log);

    const expired = removeToast(shown, 1);

    expect(ids(expired)).toEqual([2]);
    expect(ids(follow(expired, 'loaded', log))).toEqual([2]);
  });

  it('holt den verdrängten Start-Toast nicht zurück, wenn das Protokoll weiterläuft', () => {
    let queue = follow(EMPTY_TOAST_QUEUE, 'fresh', []);
    queue = follow(queue, 'fresh', entries({ type: 'unmarked' }, { type: 'noTarget' }));
    expect(ids(queue)).toEqual([1, 2]);
    queue = removeToast(removeToast(queue, 1), 2);

    queue = follow(queue, 'fresh', [
      ...arrivals(3, 51),
      { id: 52, event: { type: 'travelAborted' } },
    ]);

    expect(ids(queue)).toEqual([52]);
  });

  it('holt den Start-Toast nicht zurück, wenn das Protokoll geleert wird', () => {
    let queue = follow(EMPTY_TOAST_QUEUE, 'fresh', []);
    queue = removeToast(queue, 0);
    expect(ids(follow(queue, 'fresh', []))).toEqual([]);

    let displaced = follow(EMPTY_TOAST_QUEUE, 'fresh', []);
    displaced = follow(displaced, 'fresh', entries({ type: 'unmarked' }, { type: 'noTarget' }));
    expect(ids(follow(displaced, 'fresh', []))).toEqual([1, 2]);
  });

  it('behält einen sichtbaren Toast, auch wenn er aus dem Protokoll fällt', () => {
    let queue = follow(EMPTY_TOAST_QUEUE, 'loaded', entries({ type: 'unmarked' }));

    queue = follow(queue, 'loaded', arrivals(2, 51));
    expect(ids(queue)).toEqual([1]);

    queue = follow(queue, 'loaded', [...arrivals(3, 51), { id: 52, event: { type: 'noTarget' } }]);
    expect(ids(queue)).toEqual([1, 52]);

    queue = follow(queue, 'loaded', [
      ...arrivals(4, 51),
      { id: 52, event: { type: 'noTarget' } },
      { id: 53, event: { type: 'unmarked' } },
    ]);
    expect(ids(queue)).toEqual([52, 53]);
  });
});

describe('toGameView', () => {
  it('zeigt unterwegs die Ernte 0 und die Reise in der Kontextzeile', () => {
    const view = toGameView(
      config,
      state({
        siteId: null,
        lastHarvestRate: 7,
        travel: {
          kind: 'site',
          targetId: 2,
          fromX: 0,
          fromY: 0,
          toX: 100,
          toY: 0,
          distance: 100,
          covered: 25,
        },
      }),
      1,
      null,
    );

    expect(view.hud.harvestRate).toBe(0);
    expect(view.hud.harvestNote).toEqual({ kind: 'travelling' });
    expect(view.swarm.place).toEqual({
      kind: 'travelling',
      destination: { kind: 'site', siteType: 'carcass' },
      remaining: 75 / 20,
      progress: 0.25,
    });
    expect(view.swarm.tag).toEqual({ kind: 'none' });
  });

  it('wählt die Unterzeile der Ernte nach Vorrat und Kapazität', () => {
    expect(toGameView(config, state({ food: 2000 }), 1, null).hud.harvestNote).toEqual({
      kind: 'perSecond',
    });
    expect(toGameView(config, state({ food: 4000 }), 1, null).hud).toMatchObject({
      foodFill: 1,
      foodOver: true,
      harvestNote: { kind: 'throttled', percent: 50 },
    });
  });

  it('wählt die Unterzeile der Stelle', () => {
    const noteOf = (overrides: Partial<GameState>): unknown =>
      toGameView(config, state(overrides), 1, null).swarm.place;

    expect(noteOf({ lastHarvestRate: 4 })).toEqual({
      kind: 'site',
      siteType: 'algae',
      fill: 0.4,
      note: { kind: 'emptyIn', seconds: 100 },
    });
    expect(noteOf({})).toMatchObject({ note: { kind: 'noHarvest' } });
    expect(noteOf({ sites: [site(1, 'algae', { dead: true, stock: 0 })] })).toMatchObject({
      fill: 0,
      note: { kind: 'dried' },
    });
    expect(noteOf({ sites: [site(1, 'seagrass')], lastHarvestRate: 3 })).toMatchObject({
      note: { kind: 'average', rate: 3 },
    });
    expect(noteOf({ siteId: null })).toEqual({ kind: 'none' });
  });

  it('zeigt die Markierung vor der besten Alternative', () => {
    expect(toGameView(config, state(), 1, null).swarm.tag).toEqual({
      kind: 'alternative',
      siteType: 'carcass',
    });
    expect(
      toGameView(config, state({ mark: { kind: 'site', targetId: 2 } }), 1, null).swarm.tag,
    ).toEqual({ kind: 'mark', target: { kind: 'site', siteType: 'carcass' } });
    expect(toGameView(config, state({ sites: [site(1, 'algae')] }), 1, null).swarm.tag).toEqual({
      kind: 'none',
    });
  });

  it('sammelt die Chips in fester Reihenfolge', () => {
    const view = toGameView(
      config,
      state({
        freeUpgrades: 2,
        buffs: { feedingFrenzy: 0, layingBoost: 12, breedingFrenzy: 0, tailwind: 3 },
      }),
      10,
      null,
    );

    expect(view.chips).toEqual([
      { id: 'zone', kind: 'zone', zone: 1, threshold: 500, open: false },
      { id: 'buff-layingBoost', kind: 'buff', buff: 'layingBoost', remaining: 12 },
      { id: 'buff-tailwind', kind: 'buff', buff: 'tailwind', remaining: 3 },
      { id: 'freeUpgrades', kind: 'freeUpgrades', count: 2 },
      { id: 'tempo', kind: 'tempo', tempo: 10 },
    ]);
  });

  it('rundet den Fortschritt der Nachberechnung auf ganze Prozent', () => {
    expect(toGameView(config, state(), 1, null).catchUp).toBeNull();
    expect(toGameView(config, state(), 1, { done: 1, total: 3 }).catchUp).toEqual({
      percent: 33,
    });
  });
});
