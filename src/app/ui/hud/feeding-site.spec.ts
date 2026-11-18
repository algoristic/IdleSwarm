import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TEXTS_DE } from '../../core/data/texts.de';
import { Num } from '../../core/num/num';
import { createInitialState, GameState } from '../../core/state/game-state';
import { GameStoreService } from '../../game/game-store.service';
import { FeedingSite } from './feeding-site';

describe('FeedingSite', () => {
  let store: GameStoreService;
  let fixture: ComponentFixture<FeedingSite>;

  const element = () => fixture.nativeElement as HTMLElement;
  const query = <T extends HTMLElement>(testId: string) =>
    element().querySelector<T>(`[data-testid="${testId}"]`);
  const text = (testId: string) => query(testId)?.textContent?.trim();
  const meter = () => element().querySelector('[role="progressbar"]') as HTMLElement;

  function setup(change: (state: GameState) => GameState = (state) => state): void {
    store.replace(change(createInitialState({ seed: 'stelle', now: 0 })));
    fixture.detectChanges();
  }

  const withStock = (stock: number) => (state: GameState) => ({
    ...state,
    site: { ...state.site, stock: Num.from(stock) },
  });
  const withDrones = (drones: number) => (state: GameState) => ({
    ...state,
    units: { ...state.units, drones: Num.from(drones) },
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FeedingSite] });
    store = TestBed.inject(GameStoreService);
    fixture = TestBed.createComponent(FeedingSite);
  });

  it('ist keine Klickfläche', () => {
    setup();
    const dispatch = vi.spyOn(store, 'dispatch');

    element().querySelector('header')?.click();
    (element().querySelector('.stock') as HTMLElement).click();

    expect(element().querySelectorAll('button')).toHaveLength(0);
    expect(dispatch).not.toHaveBeenCalled();
    expect(store.state().res.food.eq(15)).toBe(true);
  });

  it('zeigt Nahrungsrate, Vorrat und Balkenwerte', () => {
    setup(withStock(5000));

    expect(text('site-rate')).toBe('1,5 Nahrung/s');
    expect(text('stock')).toBe('5.000 / 20.000');
    expect(meter().getAttribute('aria-valuenow')).toBe('25');
    expect(meter().getAttribute('aria-valuemin')).toBe('0');
    expect(meter().getAttribute('aria-valuemax')).toBe('100');
    expect(meter().getAttribute('aria-valuetext')).toBe('5.000 / 20.000');
  });

  it('zeigt im Titel die Gesamtrate aus Grundertrag und Drohnen', () => {
    setup(withDrones(50));
    expect(text('site-rate')).toBe('11,5 Nahrung/s');

    store.replace(withStock(0)(store.state()));
    fixture.detectChanges();
    expect(text('site-rate')).toBe('0,0 Nahrung/s');
  });

  it('zeigt einen Rest im Vorrat nicht als 0', () => {
    setup(withStock(0.4));
    expect(text('stock')).toBe('1 / 20.000');
    expect(query('renew')).toBeNull();
  });

  it('schätzt ohne Drohnen die Restzeit über den Grundertrag', () => {
    setup();
    expect(text('time-left')).toBe('Leer in etwa 3 h 42 min');
  });

  it('schätzt mit Drohnen die Restzeit und folgt dem Kauf', () => {
    setup(withDrones(50));
    expect(text('time-left')).toBe('Leer in etwa 29 min 00 s');

    store.replace(withDrones(1)(store.state()));
    fixture.detectChanges();
    expect(text('time-left')).toBe('Leer in etwa 3 h 16 min');
  });

  it('bietet die neue Futterstelle nur bei leerem Vorrat an', () => {
    setup(withStock(1));
    expect(query('renew')).toBeNull();
    expect(element().querySelector('[role="status"]')?.textContent?.trim()).toBe('');

    store.replace(withStock(0)(store.state()));
    fixture.detectChanges();
    expect(text('renew')).toBe(TEXTS_DE['hud.site.renew']);
    expect(element().querySelector('[role="status"]')?.textContent).toContain(
      TEXTS_DE['hud.site.empty'],
    );
    expect(query('time-left')).toBeNull();
  });

  it('füllt die Futterstelle auf und setzt den Fokus auf ihre Überschrift', () => {
    document.body.append(element());
    setup(withStock(0));
    const dispatch = vi.spyOn(store, 'dispatch');

    query<HTMLButtonElement>('renew')?.click();
    fixture.detectChanges();

    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'newSite' });
    expect(text('stock')).toBe('20.000 / 20.000');
    expect(query('renew')).toBeNull();
    expect(document.activeElement).toBe(element().querySelector('#site-title'));
    element().remove();
  });
});
