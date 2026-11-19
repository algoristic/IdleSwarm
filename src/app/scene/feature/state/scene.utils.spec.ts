import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import type { LogEntry } from '@app/engine/data-access/game-store/game-store-service.model';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import type { GameEvent } from '@app/engine/domain/models/game-event.model';
import { Num } from '@app/shared/util/num/num';

import { SPRITE_BUDGET_MOBILE } from '../../domain/scene-budget-logic';
import type { SceneSource } from './scene.model';
import { SCENE_POPUP_MAX, toSceneFrame, toScenePopups } from './scene.utils';

const state = createInitialState({ seed: 'scene', now: 0 });
const source = (overrides: Partial<SceneSource> = {}): SceneSource => ({
  state,
  width: 1280,
  height: 800,
  devicePixelRatio: 3,
  coarsePointer: false,
  reducedMotion: false,
  ...overrides,
});

const arrived = (dna: number): GameEvent => ({
  type: 'arrived',
  playedMs: 0,
  siteType: state.site.type,
  losses: Num.ZERO,
  dna: Num.from(dna),
});
const found = { type: 'found', playedMs: 0 } as unknown as GameEvent;
const entry = (id: number, event: GameEvent): LogEntry => ({ id, event });

describe('toSceneFrame', () => {
  it('deckelt das Pixelverhältnis und zeichnet am Standort mit Ertrag', () => {
    const frame = toSceneFrame(source(), DEFAULT_BALANCE);
    expect(frame.pixelRatio).toBe(2);
    expect(frame.traveling).toBe(false);
    expect(frame.stockShare).toBe(1);
    expect(frame.yieldParticleRate).toBeGreaterThan(0);
  });

  it('teilt große Schwärme mobil auf 150 Sprites auf', () => {
    const big = {
      ...state,
      units: { queens: Num.from(10), drones: Num.from(10_000), soldiers: Num.from(500) },
    };
    const frame = toSceneFrame(source({ state: big, coarsePointer: true }), DEFAULT_BALANCE);
    const { queens, drones, soldiers } = frame.sprites;
    expect(queens + drones + soldiers).toBe(SPRITE_BUDGET_MOBILE);
    expect(queens).toBeGreaterThanOrEqual(1);
  });

  it('zeigt unterwegs keine Ertragsteilchen', () => {
    const traveling = {
      ...state,
      travel: { target: state.map.candidates[0], remainingMs: 1000 },
    };
    const frame = toSceneFrame(source({ state: traveling }), DEFAULT_BALANCE);
    expect(frame.traveling).toBe(true);
    expect(frame.yieldParticleRate).toBe(0);
  });
});

describe('toScenePopups', () => {
  it('zeigt nur neue Einnahmen mit DNA und Funde', () => {
    const log = [
      entry(1, arrived(12)),
      entry(2, arrived(0)),
      entry(3, found),
      entry(4, arrived(5)),
    ];
    const popups = toScenePopups(log, 1);
    expect(popups.map((popup) => popup.id)).toEqual([3, 4]);
    expect(popups[0].dna).toBeNull();
    expect(popups[1].dna?.toNumber()).toBe(5);
  });

  it('behält nur die neuesten Zahlen', () => {
    const log = Array.from({ length: 6 }, (_, i) => entry(i, arrived(1)));
    expect(toScenePopups(log, -1).map((popup) => popup.id)).toEqual(
      [3, 4, 5].slice(-SCENE_POPUP_MAX),
    );
  });
});
