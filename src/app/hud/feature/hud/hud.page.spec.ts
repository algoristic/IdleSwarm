import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TICK_MS } from '@app/balance/domain/constants';
import { GameStore } from '@app/engine/data-access/game-store/game-store.service';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import { GameState } from '@app/engine/domain/models/game-state.model';
import { KEY_VALUE_STORE } from '@app/persistence/data-access/persistence/persistence-service.tokens';
import { PersistenceService } from '@app/persistence/data-access/persistence/persistence.service';
import { KeyValueStore, SAVE_KEY, saveGame } from '@app/persistence/domain/slots-logic';
import { Num } from '@app/shared/util/num/num';
import { Units } from '@app/swarm/domain/models/units.model';

import { provideHudState } from '../state/hud.providers';
import { HudPage } from './hud.page';

const SAVED_AT = Date.UTC(2026, 0, 2, 3, 4, 5);

describe('HudPage', () => {
  let items: Map<string, string>;
  let failWrites: boolean;
  let memory: KeyValueStore;
  let store: GameStore;
  let persistence: PersistenceService;
  let fixture: ComponentFixture<HudPage>;

  const element = () => fixture.nativeElement as HTMLElement;
  const query = (testId: string) => element().querySelector(`[data-testid="${testId}"]`);
  const text = (testId: string) => query(testId)?.textContent?.replace(/\s+/g, ' ').trim();
  const liveRegion = () => element().querySelector('footer [role="status"]') as HTMLElement;
  const spaceBar = () => element().querySelector(`[role="progressbar"][aria-label="Platz"]`);

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
      providers: [
        GameStore,
        PersistenceService,
        provideHudState(),
        provideRouter([]),
        { provide: KEY_VALUE_STORE, useValue: memory },
      ],
    });
    store = TestBed.inject(GameStore);
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

    expect(element().querySelector('h1')?.textContent).toBe('IdleSwarm');
    expect(text('hud.resources.food')).toBe('1.284');
    // 1,5 Grundertrag + 16 · 0,2 Drohnen
    expect(text('hud.resources.food-rate')).toBe('4,7');
    expect(text('hud.resources.base-rate')).toBe('1,5');
    expect(text('hud.resources.drone-rate')).toBe('3,2');
    expect(text('hud.resources.eggs')).toBe('12,0');
    expect(text('hud.resources.attack')).toBe('3');
    expect(text('hud.resources.dna')).toBe('0');
  });

  it('verlinkt die Umgebung zum Weiterziehen', () => {
    setUnits({});
    expect(query('hud.nav.environment')?.getAttribute('href')).toBe('/umgebung');
  });

  it('zeigt bei leerem Vorrat alle Nahrungsraten als 0', () => {
    const base = state();
    store.replace({
      ...base,
      units: { ...base.units, drones: Num.from(5) },
      site: { ...base.site, stock: Num.ZERO },
    });
    fixture.detectChanges();
    expect(text('hud.resources.food-rate')).toBe('0,0');
    expect(text('hud.resources.base-rate')).toBe('0,0');
    expect(text('hud.resources.drone-rate')).toBe('0,0');
  });

  it('bietet je Einheit einen Kaufknopf', () => {
    setUnits({});
    expect(element().querySelectorAll('app-buy-button')).toHaveLength(3);
  });

  it('aktualisiert die Nahrung über den Grundertrag, auch ohne Einheiten', () => {
    setUnits({ queens: 0 });
    store.tick(1000);
    fixture.detectChanges();
    expect(text('hud.resources.food')).toBe('16');
  });

  it('zeigt den Platz ohne Warnung unter 90 %', () => {
    setUnits({ drones: 8 });

    expect(text('hud.space.value')).toBe('8 / 10 (80 %)');
    expect(spaceBar()?.getAttribute('aria-valuenow')).toBe('80');
    expect(query('hud.space.warning')).toBeNull();
    expect(spaceBar()?.querySelector('[data-warning]')).toBeNull();
  });

  it('warnt ab 90 % mit Farbe und Text', () => {
    setUnits({ drones: 9 });

    expect(text('hud.space.warning')).toBe('Der Platz wird knapp.');
    expect(query('hud.space.value')?.hasAttribute('data-warning')).toBe(true);
    expect(
      spaceBar()?.querySelector('[data-testid="hud.meter.fill"]')?.hasAttribute('data-warning'),
    ).toBe(true);
  });

  it('deckelt den Balken bei 100 %, die Zahlen aber nicht', () => {
    setUnits({ queens: 2, drones: 15, soldiers: 3 });

    expect(text('hud.space.value')).toBe('21 / 20 (105 %)');
    expect(spaceBar()?.getAttribute('aria-valuenow')).toBe('100');
    expect(
      (spaceBar()?.querySelector('[data-testid="hud.meter.fill"]') as HTMLElement).style.width,
    ).toBe('100%');
  });

  it('kommt ohne verfügbaren Platz aus', () => {
    setUnits({ queens: 0, drones: 2 });

    expect(text('hud.space.value')).toBe('2 / 0');
    expect(spaceBar()?.getAttribute('aria-valuenow')).toBe('100');
    expect(query('hud.space.warning')).not.toBeNull();
  });

  it('meldet ein noch nie gespeichertes Spiel', () => {
    persistence.restore();
    fixture.detectChanges();
    expect(text('hud.status.last-saved')).toContain('Noch nicht gespeichert');
  });

  it('zeigt den Zeitpunkt des letzten Speicherns', () => {
    saveGame(memory, state(), SAVED_AT);
    persistence.restore();
    fixture.detectChanges();

    const time = query('hud.status.last-saved')?.querySelector('time');
    expect(time?.getAttribute('datetime')).toBe(new Date(SAVED_AT).toISOString());
    expect(time?.textContent).toContain('2026');
  });

  it('behandelt einen Zeitwert außerhalb des Date-Bereichs wie nie gespeichert', () => {
    saveGame(memory, state(), 1e300);
    persistence.restore();
    fixture.detectChanges();
    expect(text('hud.status.last-saved')).toContain('Noch nicht gespeichert');
  });

  it('hält die Live-Region ohne Hinweis leer und ohne tickende Werte', () => {
    persistence.restore();
    fixture.detectChanges();
    expect(liveRegion().textContent?.trim()).toBe('');
    expect(liveRegion().contains(query('hud.resources.food'))).toBe(false);
  });

  it('weist auf einen unlesbaren Spielstand hin', () => {
    items.set(SAVE_KEY, 'kaputt');
    persistence.restore();
    fixture.detectChanges();
    expect(liveRegion().textContent).toContain(
      'Der Spielstand konnte nicht gelesen werden. Es wurde ein neues Spiel begonnen.',
    );
  });

  it('weist auf die Wiederherstellung aus dem Backup hin', () => {
    persistence.save();
    store.tick(100);
    persistence.save();
    items.set(SAVE_KEY, 'kaputt');
    persistence.restore();
    fixture.detectChanges();
    expect(liveRegion().textContent).toContain(
      'Der Spielstand war beschädigt und wurde aus der Sicherung wiederhergestellt.',
    );
  });

  it('weist auf fehlgeschlagenes Speichern hin und nimmt den Hinweis wieder weg', () => {
    failWrites = true;
    persistence.save();
    fixture.detectChanges();
    expect(liveRegion().textContent).toContain(
      'Speichern ist fehlgeschlagen. Es wird beim nächsten Mal erneut versucht.',
    );

    failWrites = false;
    persistence.save();
    fixture.detectChanges();
    expect(liveRegion().textContent?.trim()).toBe('');
  });

  describe('Kaufen', () => {
    const buyButton = (unit: string) => query(`hud.units.${unit}.buy`) as HTMLButtonElement | null;

    it('zeigt Anzahl, Preis und den Effekt der Königin', () => {
      setUnits({ drones: 3.9 });
      expect(text('hud.units.drones.count')).toBe('Anzahl: 3');
      expect(text('hud.units.drones.price')).toBe('Preis: 10 Nahrung');
      expect(text('hud.units.queens.effect')).toBe('+6,0 Eier/min, +10 Platz');
      expect(query('hud.units.drones.effect')).toBeNull();
    });

    it('kauft beim Klick und zeigt den neuen Stand', () => {
      setUnits({});
      buyButton('drones')?.click();
      fixture.detectChanges();

      expect(store.state().units.drones.eq(1)).toBe(true);
      expect(text('hud.units.drones.count')).toBe('Anzahl: 1');
      expect(text('hud.units.drones.price')).toBe('Preis: 11 Nahrung');
      expect(buyButton('drones')?.disabled).toBe(true);
    });

    it('kauft ohne genug Nahrung nichts', () => {
      setUnits({});
      const dispatch = vi.spyOn(store, 'dispatch');
      expect(buyButton('soldiers')?.disabled).toBe(true);
      buyButton('soldiers')?.click();
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe('Futterstelle', () => {
    function setSite(stock: number, drones = 0): void {
      const base = state();
      store.replace({
        ...base,
        units: { ...base.units, drones: Num.from(drones) },
        site: { ...base.site, stock: Num.from(stock) },
      });
      fixture.detectChanges();
    }

    it('zeigt im Titel die Gesamtrate aus Grundertrag und Drohnen', () => {
      setSite(20_000, 50);
      expect(text('hud.site.rate')).toBe('11,5 Nahrung/s');
      setSite(0, 50);
      expect(text('hud.site.rate')).toBe('0,0 Nahrung/s');
    });

    it('schätzt die Restzeit über Grundertrag und Drohnen', () => {
      setSite(20_000);
      expect(text('hud.site.time-left')).toBe('Leer in etwa 3 h 42 min');
      setSite(20_000, 50);
      expect(text('hud.site.time-left')).toBe('Leer in etwa 29 min 00 s');
    });

    it('zeigt die leere Futterstelle ohne Erneuern', () => {
      setSite(0);

      expect(text('hud.site.stock')).toBe('0 / 20.000');
      expect(query('hud.site.time-left')).toBeNull();
      expect(query('hud.site.renew')).toBeNull();
    });
  });

  describe('Opfern und Log', () => {
    const input = () => query('hud.sacrifice.count') as HTMLInputElement;

    it('opfert die gewählte Anzahl Drohnen für Nahrung', async () => {
      setUnits({ drones: 10.5 });
      const food = store.state().res.food;
      input().value = '10';
      input().dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(text('hud.sacrifice.yield')).toBe('Ertrag: 50 Nahrung');

      (query('hud.sacrifice.submit') as HTMLButtonElement).click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(store.state().units.drones.toNumber()).toBeCloseTo(0.5);
      expect(store.state().res.food.sub(food).toNumber()).toBe(50);
    });

    it('zeigt Ereignisse neueste zuerst, außerhalb der Status-Region', () => {
      const base = state();
      store.replace({ ...base, site: { ...base.site, stock: Num.from(0.01) } });
      fixture.detectChanges();
      expect(text('hud.log.empty')).toBe('Noch keine Ereignisse.');

      store.tick(TICK_MS);
      fixture.detectChanges();
      const entries = element().querySelectorAll('[data-testid="hud.log.entry"]');
      expect(entries).toHaveLength(1);
      expect(entries[0].querySelector('[data-testid="hud.log.text"]')?.textContent).toContain(
        'Futterstelle leer',
      );
      expect(query('hud.log.empty')).toBeNull();
      expect(query('hud.site.move-link')).not.toBeNull();
    });
  });
});
