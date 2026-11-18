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
  const site = () => query<HTMLButtonElement>('site') as HTMLButtonElement;
  const gains = () => Array.from(element().querySelectorAll<HTMLElement>('[data-testid="gain"]'));
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

  function mouseClick(x: number, y: number): void {
    site().dispatchEvent(
      new MouseEvent('click', { bubbles: true, detail: 1, clientX: x, clientY: y }),
    );
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FeedingSite] });
    store = TestBed.inject(GameStoreService);
    fixture = TestBed.createComponent(FeedingSite);
  });

  it('löst beim Klick auf die Futterstelle das Kommando aus', () => {
    setup();
    const dispatch = vi.spyOn(store, 'dispatch');

    site().click();

    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'click' });
    expect(store.state().res.food.eq(16)).toBe(true);
    expect(store.state().site.stock.eq(19_999)).toBe(true);
  });

  it('reagiert nicht auf Klicks neben die Futterstelle', () => {
    setup();
    const dispatch = vi.spyOn(store, 'dispatch');

    element().querySelector('header')?.click();
    (element().querySelector('.stock') as HTMLElement).click();

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('zeigt Klickertrag, Vorrat und Balkenwerte', () => {
    setup(withStock(5000));

    expect(text('click-yield')).toBe('Klickertrag: +1 Nahrung');
    expect(text('stock')).toBe('5.000 / 20.000');
    expect(meter().getAttribute('aria-valuenow')).toBe('25');
    expect(meter().getAttribute('aria-valuemin')).toBe('0');
    expect(meter().getAttribute('aria-valuemax')).toBe('100');
    expect(meter().getAttribute('aria-valuetext')).toBe('5.000 / 20.000');
  });

  it('zeigt einen Rest im Vorrat nicht als 0', () => {
    setup(withStock(0.4));
    expect(text('stock')).toBe('1 / 20.000');
    expect(text('click-yield')).toBe('Klickertrag: +0,4 Nahrung');
    expect(query('renew')).toBeNull();
  });

  it('nennt ohne Drohnen statt einer Zeit einen Hinweis', () => {
    setup();
    expect(text('time-left')).toBe(TEXTS_DE['hud.site.noDrones']);
  });

  it('schätzt mit Drohnen die Restzeit und folgt dem Kauf', () => {
    setup(withDrones(50));
    expect(text('time-left')).toBe('Leer in etwa 33 min 20 s');

    store.replace(withDrones(1)(store.state()));
    fixture.detectChanges();
    expect(text('time-left')).toBe('Leer in etwa 27 h 46 min');
  });

  it('zeigt die Zahl am Klickpunkt', () => {
    setup();
    mouseClick(30, 40);

    expect(gains()).toHaveLength(1);
    expect(gains()[0].textContent).toBe('+1');
    expect(gains()[0].style.left).toBe('30px');
    expect(gains()[0].style.top).toBe('40px');
    expect(gains()[0].closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('zeigt die Zahl bei Tastaturbedienung mittig', () => {
    setup();
    site().click();
    fixture.detectChanges();

    expect(gains()[0].style.left).toBe('50%');
    expect(gains()[0].style.top).toBe('50%');
  });

  it('zeigt den tatsächlichen Ertrag', () => {
    setup(withStock(0.4));
    site().click();
    fixture.detectChanges();
    expect(gains()[0].textContent).toBe('+0,4');
  });

  it('zeigt bei leerer Futterstelle keine Zahl', () => {
    setup(withStock(0));
    mouseClick(1, 1);
    expect(gains()).toHaveLength(0);
    expect(store.state().res.food.eq(15)).toBe(true);
  });

  it('entfernt die Zahl nach der Animation', () => {
    setup();
    site().click();
    fixture.detectChanges();

    gains()[0].dispatchEvent(new Event('animationend'));
    fixture.detectChanges();
    expect(gains()).toHaveLength(0);
  });

  it('begrenzt die Anzahl der Zahlen', () => {
    setup();
    for (let i = 0; i < 30; i++) {
      mouseClick(i, 0);
    }
    expect(gains()).toHaveLength(12);
    expect(gains()[11].style.left).toBe('29px');
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

  it('füllt die Futterstelle auf und gibt den Fokus an sie weiter', () => {
    document.body.append(element());
    setup(withStock(0));
    const dispatch = vi.spyOn(store, 'dispatch');

    query<HTMLButtonElement>('renew')?.click();
    fixture.detectChanges();

    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'newSite' });
    expect(text('stock')).toBe('20.000 / 20.000');
    expect(query('renew')).toBeNull();
    expect(document.activeElement).toBe(site());
    element().remove();
  });
});
