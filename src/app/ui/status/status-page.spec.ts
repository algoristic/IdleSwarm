import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TEXTS_DE } from '../../core/data/texts.de';
import { Num } from '../../core/num/num';
import { KeyValueStore, SAVE_KEY, saveGame } from '../../core/save/slots';
import { createInitialState, GameState } from '../../core/state/game-state';
import { GameStoreService } from '../../game/game-store.service';
import { KEY_VALUE_STORE, PersistenceService } from '../../game/persistence.service';
import { StatusPage } from './status-page';

const SAVED_AT = Date.UTC(2026, 0, 2, 3, 4, 5);

describe('StatusPage', () => {
  let items: Map<string, string>;
  let failWrites: boolean;
  let store: GameStoreService;
  let persistence: PersistenceService;
  let fixture: ComponentFixture<StatusPage>;

  const element = () => fixture.nativeElement as HTMLElement;
  const text = (testId: string) =>
    element().querySelector(`[data-testid="${testId}"]`)?.textContent?.trim();
  const liveRegion = () => element().querySelector('[role="status"]') as HTMLElement;

  function state(): GameState {
    return createInitialState({ seed: 'status', now: SAVED_AT });
  }

  beforeEach(() => {
    items = new Map();
    failWrites = false;
    const memory: KeyValueStore = {
      getItem: (key) => items.get(key) ?? null,
      setItem: (key, value) => {
        if (failWrites) {
          throw new Error('voll');
        }
        items.set(key, value);
      },
      removeItem: (key) => void items.delete(key),
    };
    TestBed.configureTestingModule({
      imports: [StatusPage],
      providers: [{ provide: KEY_VALUE_STORE, useValue: memory }],
    });
    store = TestBed.inject(GameStoreService);
    persistence = TestBed.inject(PersistenceService);
    fixture = TestBed.createComponent(StatusPage);
  });

  it('zeigt Überschrift, Spielzeit und Nahrung formatiert', () => {
    const base = state();
    store.replace({
      ...base,
      time: { ...base.time, played: 1234_500 },
      res: { ...base.res, food: Num.from(1284) },
    });
    fixture.detectChanges();

    expect(element().querySelector('h1')?.textContent).toBe(TEXTS_DE['status.title']);
    expect(text('played')).toBe('1.234,5');
    expect(text('food')).toBe('1.284');
  });

  it('aktualisiert die Spielzeit mit jedem Tick', () => {
    store.replace(state());
    fixture.detectChanges();
    expect(text('played')).toBe('0,0');

    store.tick(100);
    fixture.detectChanges();
    expect(text('played')).toBe('0,1');
  });

  it('meldet ein noch nie gespeichertes Spiel', () => {
    persistence.restore();
    fixture.detectChanges();
    expect(text('last-saved')).toBe(TEXTS_DE['status.neverSaved']);
  });

  it('zeigt den Zeitpunkt des letzten Speicherns', () => {
    saveGame(
      {
        getItem: (key) => items.get(key) ?? null,
        setItem: (key, value) => void items.set(key, value),
        removeItem: (key) => void items.delete(key),
      },
      state(),
      SAVED_AT,
    );
    persistence.restore();
    fixture.detectChanges();

    const time = element().querySelector('[data-testid="last-saved"] time');
    expect(time?.getAttribute('datetime')).toBe(new Date(SAVED_AT).toISOString());
    expect(time?.textContent).toContain('2026');
  });

  it('behandelt einen Zeitwert außerhalb des Date-Bereichs wie nie gespeichert', () => {
    const base = state();
    saveGame(
      {
        getItem: (key) => items.get(key) ?? null,
        setItem: (key, value) => void items.set(key, value),
        removeItem: (key) => void items.delete(key),
      },
      base,
      1e300,
    );
    persistence.restore();
    fixture.detectChanges();
    expect(text('last-saved')).toBe(TEXTS_DE['status.neverSaved']);
  });

  it('hält die Live-Region ohne Hinweis leer und ohne tickende Zeit', () => {
    persistence.restore();
    fixture.detectChanges();
    expect(liveRegion().textContent?.trim()).toBe('');
    expect(liveRegion().contains(element().querySelector('[data-testid="played"]'))).toBe(false);
  });

  it('weist auf einen unlesbaren Spielstand hin', () => {
    items.set(SAVE_KEY, 'kaputt');
    persistence.restore();
    fixture.detectChanges();
    expect(liveRegion().textContent).toContain(TEXTS_DE['status.notice.saveUnreadable']);
  });

  it('weist auf die Wiederherstellung aus dem Backup hin', () => {
    persistence.save();
    store.tick(100);
    persistence.save();
    items.set(SAVE_KEY, 'kaputt');
    persistence.restore();
    fixture.detectChanges();
    expect(liveRegion().textContent).toContain(TEXTS_DE['status.notice.restoredFromBackup']);
  });

  it('weist auf fehlgeschlagenes Speichern hin und nimmt den Hinweis wieder weg', () => {
    failWrites = true;
    persistence.save();
    fixture.detectChanges();
    expect(liveRegion().textContent).toContain(TEXTS_DE['status.notice.saveFailed']);

    failWrites = false;
    persistence.save();
    fixture.detectChanges();
    expect(liveRegion().textContent?.trim()).toBe('');
  });
});
