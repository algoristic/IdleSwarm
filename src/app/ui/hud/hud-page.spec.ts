import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TEXTS_DE } from '../../core/data/texts.de';
import { Num } from '../../core/num/num';
import { KeyValueStore, SAVE_KEY, saveGame } from '../../core/save/slots';
import { createInitialState, GameState, Units } from '../../core/state/game-state';
import { GameStoreService } from '../../game/game-store.service';
import { KEY_VALUE_STORE, PersistenceService } from '../../game/persistence.service';
import { HudPage } from './hud-page';

const SAVED_AT = Date.UTC(2026, 0, 2, 3, 4, 5);

describe('HudPage', () => {
  let items: Map<string, string>;
  let failWrites: boolean;
  let memory: KeyValueStore;
  let store: GameStoreService;
  let persistence: PersistenceService;
  let fixture: ComponentFixture<HudPage>;

  const element = () => fixture.nativeElement as HTMLElement;
  const query = (testId: string) => element().querySelector(`[data-testid="${testId}"]`);
  const text = (testId: string) => query(testId)?.textContent?.replace(/\s+/g, ' ').trim();
  const liveRegion = () => element().querySelector('footer [role="status"]') as HTMLElement;
  const spaceBar = () =>
    element().querySelector(`[role="progressbar"][aria-label="${TEXTS_DE['hud.space.title']}"]`);

  function state(): GameState {
    return createInitialState({ seed: 'hud', now: SAVED_AT });
  }

  function setUnits(units: Partial<Record<keyof Units, number>>): void {
    const base = state();
    store.replace({
      ...base,
      units: {
        queens: Num.from(units.queens ?? 1),
        drones: Num.from(units.drones ?? 0),
        soldiers: Num.from(units.soldiers ?? 0),
      },
    });
    fixture.detectChanges();
  }

  beforeEach(() => {
    items = new Map();
    failWrites = false;
    memory = {
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
      imports: [HudPage],
      providers: [{ provide: KEY_VALUE_STORE, useValue: memory }],
    });
    store = TestBed.inject(GameStoreService);
    persistence = TestBed.inject(PersistenceService);
    fixture = TestBed.createComponent(HudPage);
  });

  it('zeigt Überschrift und Ressourcen, Mengen abgerundet', () => {
    const base = state();
    store.replace({
      ...base,
      res: { ...base.res, food: Num.from(1284.9) },
      units: { queens: Num.from(2), drones: Num.from(16), soldiers: Num.from(3.9) },
    });
    fixture.detectChanges();

    expect(element().querySelector('h1')?.textContent).toBe(TEXTS_DE['hud.title']);
    expect(text('food')).toBe('1.284');
    expect(text('food-rate')).toBe('3,2');
    expect(text('eggs')).toBe('12,0');
    expect(text('attack')).toBe('3');
  });

  it('zeigt bei leerem Vorrat die Sammelrate 0', () => {
    const base = state();
    store.replace({
      ...base,
      units: { ...base.units, drones: Num.from(5) },
      site: { ...base.site, stock: Num.ZERO },
    });
    fixture.detectChanges();
    expect(text('food-rate')).toBe('0,0');
  });

  it('bietet je Einheit einen Kaufknopf', () => {
    setUnits({});
    expect(element().querySelectorAll('app-buy-button')).toHaveLength(3);
  });

  it('aktualisiert die Nahrung nach einem Klick auf die Futterstelle', () => {
    setUnits({});
    (query('site') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(text('food')).toBe('16');
  });

  it('zeigt den Platz ohne Warnung unter 90 %', () => {
    setUnits({ drones: 8 });

    expect(text('space')).toBe('8 / 10 (80 %)');
    expect(spaceBar()?.getAttribute('aria-valuenow')).toBe('80');
    expect(query('space-warning')).toBeNull();
    expect(element().querySelector('.fill.warning')).toBeNull();
  });

  it('warnt ab 90 % mit Farbe und Text', () => {
    setUnits({ drones: 9 });

    expect(text('space-warning')).toBe(TEXTS_DE['hud.space.warning']);
    expect(query('space')?.classList.contains('warning')).toBe(true);
    expect(spaceBar()?.querySelector('.fill')?.classList.contains('warning')).toBe(true);
  });

  it('deckelt den Balken bei 100 %, die Zahlen aber nicht', () => {
    setUnits({ queens: 2, drones: 15, soldiers: 3 });

    expect(text('space')).toBe('21 / 20 (105 %)');
    expect(spaceBar()?.getAttribute('aria-valuenow')).toBe('100');
    expect((spaceBar()?.querySelector('.fill') as HTMLElement).style.width).toBe('100%');
  });

  it('kommt ohne verfügbaren Platz aus', () => {
    setUnits({ queens: 0, drones: 2 });

    expect(text('space')).toBe('2 / 0');
    expect(spaceBar()?.getAttribute('aria-valuenow')).toBe('100');
    expect(query('space-warning')).not.toBeNull();
  });

  it('meldet ein noch nie gespeichertes Spiel', () => {
    persistence.restore();
    fixture.detectChanges();
    expect(text('last-saved')).toContain(TEXTS_DE['status.neverSaved']);
  });

  it('zeigt den Zeitpunkt des letzten Speicherns', () => {
    saveGame(memory, state(), SAVED_AT);
    persistence.restore();
    fixture.detectChanges();

    const time = query('last-saved')?.querySelector('time');
    expect(time?.getAttribute('datetime')).toBe(new Date(SAVED_AT).toISOString());
    expect(time?.textContent).toContain('2026');
  });

  it('behandelt einen Zeitwert außerhalb des Date-Bereichs wie nie gespeichert', () => {
    saveGame(memory, state(), 1e300);
    persistence.restore();
    fixture.detectChanges();
    expect(text('last-saved')).toContain(TEXTS_DE['status.neverSaved']);
  });

  it('hält die Live-Region ohne Hinweis leer und ohne tickende Werte', () => {
    persistence.restore();
    fixture.detectChanges();
    expect(liveRegion().textContent?.trim()).toBe('');
    expect(liveRegion().contains(query('food'))).toBe(false);
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
