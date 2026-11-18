import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TEXTS_DE } from '../../core/data/texts.de';
import type { UnitType } from '../../core/data/units';
import { Num } from '../../core/num/num';
import { createInitialState, GameState } from '../../core/state/game-state';
import { GameStoreService } from '../../game/game-store.service';
import { BuyButton } from './buy-button';

describe('BuyButton', () => {
  let store: GameStoreService;
  let fixture: ComponentFixture<BuyButton>;

  const element = () => fixture.nativeElement as HTMLElement;
  const button = () => element().querySelector('button') as HTMLButtonElement;
  const text = (testId: string) =>
    element().querySelector(`[data-testid="${testId}"]`)?.textContent?.trim();

  function setup(unit: UnitType, change: (state: GameState) => GameState = (state) => state): void {
    store.replace(change(createInitialState({ seed: 'kauf', now: 0 })));
    fixture.componentRef.setInput('unit', unit);
    fixture.detectChanges();
  }

  const withFood = (food: number) => (state: GameState) => ({
    ...state,
    res: { ...state.res, food: Num.from(food) },
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BuyButton] });
    store = TestBed.inject(GameStoreService);
    fixture = TestBed.createComponent(BuyButton);
  });

  it('zeigt Name, abgerundete Anzahl und Preis', () => {
    setup('drones', (state) => ({
      ...state,
      units: { ...state.units, drones: Num.from(3.9) },
    }));

    expect(button().textContent).toContain(TEXTS_DE['hud.unit.drones']);
    expect(text('count')).toBe('Anzahl: 3');
    expect(text('price')).toBe('Preis: 10 Nahrung');
  });

  it('rundet den Preis auf', () => {
    setup('drones', (state) => ({
      ...state,
      bought: { ...state.bought, drones: Num.ONE },
    }));
    expect(text('price')).toBe('Preis: 11 Nahrung');
  });

  it('verlangt auf einem aktiven Knopf nie mehr, als an Nahrung angezeigt wird', () => {
    setup('drones', (state) => ({
      ...withFood(10.8)(state),
      bought: { ...state.bought, drones: Num.ONE },
    }));
    expect(button().disabled).toBe(false);
    expect(text('price')).toBe('Preis: 10 Nahrung');
  });

  it('wirkt ohne genug Nahrung nicht bezahlbar', () => {
    setup('drones', (state) => ({
      ...withFood(10.6)(state),
      bought: { ...state.bought, drones: Num.ONE },
    }));
    expect(button().disabled).toBe(true);
    expect(text('price')).toBe('Preis: 11 Nahrung');
  });

  it('ist bei zu wenig Nahrung deaktiviert und kauft dann nichts', () => {
    setup('soldiers');
    const dispatch = vi.spyOn(store, 'dispatch');

    expect(button().disabled).toBe(true);
    button().click();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('löst beim Klick den Kauf aus und zeigt den neuen Stand', () => {
    setup('drones');
    const dispatch = vi.spyOn(store, 'dispatch');

    button().click();
    fixture.detectChanges();

    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'buy', unit: 'drones' });
    expect(text('count')).toBe('Anzahl: 1');
    expect(text('price')).toBe('Preis: 11 Nahrung');
    expect(button().disabled).toBe(true);
  });

  it('zeigt den Effekt nur bei der Königin', () => {
    setup('queens');
    expect(text('effect')).toBe('+6,0 Eier/min, +10 Platz');

    fixture.componentRef.setInput('unit', 'drones');
    fixture.detectChanges();
    expect(text('effect')).toBeUndefined();
  });
});
