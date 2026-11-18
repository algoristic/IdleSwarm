import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Num } from '@app/shared/util/num/num';

import { BuyButtonComponent } from './buy-button.component';
import type { UnitView } from './buy-button.component.model';

describe('BuyButtonComponent', () => {
  let fixture: ComponentFixture<BuyButtonComponent>;

  const element = () => fixture.nativeElement as HTMLElement;
  const button = () => element().querySelector('button') as HTMLButtonElement;
  const text = (testId: string) =>
    element().querySelector(`[data-testid="${testId}"]`)?.textContent?.trim();

  function render(unit: Partial<UnitView> = {}): void {
    fixture.componentRef.setInput('unit', {
      id: 'drones',
      count: Num.from(3.9),
      price: Num.from(10),
      affordable: true,
      queenEffect: null,
      ...unit,
    } satisfies UnitView);
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BuyButtonComponent] });
    fixture = TestBed.createComponent(BuyButtonComponent);
  });

  it('zeigt Name, abgerundete Anzahl und Preis', () => {
    render();
    expect(button().textContent).toContain('Drohne');
    expect(text('hud.units.drones.count')).toBe('Anzahl: 3');
    expect(text('hud.units.drones.price')).toBe('Preis: 10 Nahrung');
    expect(text('hud.units.drones.effect')).toBeUndefined();
  });

  it('meldet den Kauf mit dem Einheitentyp', () => {
    render({ id: 'soldiers' });
    const clicked = vi.fn();
    fixture.componentInstance.clickedBuy.subscribe(clicked);

    button().click();

    expect(button().textContent).toContain('Soldat');
    expect(clicked).toHaveBeenCalledExactlyOnceWith('soldiers');
  });

  it('ist ohne genug Nahrung deaktiviert und meldet keinen Kauf', () => {
    render({ affordable: false });
    const clicked = vi.fn();
    fixture.componentInstance.clickedBuy.subscribe(clicked);

    button().click();

    expect(button().disabled).toBe(true);
    expect(clicked).not.toHaveBeenCalled();
  });

  it('zeigt den Effekt der Königin', () => {
    render({ id: 'queens', queenEffect: { eggsPerMin: Num.from(6), space: Num.from(10) } });
    expect(button().textContent).toContain('Königin');
    expect(text('hud.units.queens.effect')).toBe('+6,0 Eier/min, +10 Platz');
  });
});
