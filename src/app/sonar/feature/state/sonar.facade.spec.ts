import { TestBed } from '@angular/core/testing';

import { GameStore } from '@app/engine/data-access/game-store/game-store.service';
import type { Command } from '@app/engine/domain/commands-logic';

import { SonarFacade } from './sonar.facade';

describe('SonarFacade', () => {
  let store: GameStore;
  let facade: SonarFacade;
  let dispatched: Command[];

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GameStore, SonarFacade] });
    store = TestBed.inject(GameStore);
    facade = TestBed.inject(SonarFacade);
    dispatched = [];
    const dispatch = store.dispatch.bind(store);
    vi.spyOn(store, 'dispatch').mockImplementation((cmd) => {
      dispatched.push(cmd);
      dispatch(cmd);
    });
  });

  it('übersetzt die Aktionen in Kommandos', () => {
    facade.depart(2);
    facade.setPriority('soldiers-first');
    facade.setStrategy('battle-hardened');
    facade.setAutoEnabled(true);
    facade.setAutoThresholdPercent(25);
    facade.convertDronesToQueen();

    expect(dispatched).toEqual([
      { type: 'depart', target: 2 },
      { type: 'setTransportPriority', priority: 'soldiers-first' },
      { type: 'setAutoMove', strategy: 'battle-hardened' },
      { type: 'setAutoMove', enabled: true },
      { type: 'setAutoMove', threshold: 0.25 },
      { type: 'convertDronesToQueen' },
    ]);
    expect(facade.sonar().settings).toMatchObject({
      priority: 'soldiers-first',
      strategy: 'battle-hardened',
      autoEnabled: true,
      thresholdPercent: 25,
    });
  });

  it('hält die Auswahl als lokalen Zustand und verwirft sie nach einem Weiterzug', () => {
    facade.select(3);
    expect(facade.sonar().selected?.index).toBe(3);
    expect(dispatched).toEqual([]);

    const state = store.state();
    store.replace({ ...state, map: { ...state.map, moves: state.map.moves + 1 } });
    expect(facade.sonar().selected?.index).toBe(facade.sonar().strategyTarget ?? undefined);
  });
});
