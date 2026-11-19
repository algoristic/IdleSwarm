import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Num } from '@app/shared/util/num/num';

import { FormSacrificeDronesComponent } from './form-sacrifice-drones.component';
import type { SacrificeView } from './form-sacrifice-drones.component.model';

describe('FormSacrificeDronesComponent', () => {
  let fixture: ComponentFixture<FormSacrificeDronesComponent>;
  let emitted: number[];

  const element = () => fixture.nativeElement as HTMLElement;
  const query = <T extends HTMLElement>(testId: string) =>
    element().querySelector<T>(`[data-testid="${testId}"]`);
  const text = (testId: string) => query(testId)?.textContent?.replace(/\s+/g, ' ').trim();
  const input = () => query<HTMLInputElement>('hud.sacrifice.count') as HTMLInputElement;
  const submit = () => query<HTMLButtonElement>('hud.sacrifice.submit') as HTMLButtonElement;
  const errors = () =>
    Array.from(element().querySelectorAll('[data-testid="hud.sacrifice.error"]'), (e) =>
      e.textContent?.trim(),
    );

  function render(sacrifice: Partial<SacrificeView> = {}): void {
    fixture.componentRef.setInput('sacrifice', {
      maxCount: 1234,
      foodPerDrone: Num.from(5),
      lossPercent: 50,
      ...sacrifice,
    } satisfies SacrificeView);
    fixture.detectChanges();
  }

  function type(value: string): void {
    input().value = value;
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FormSacrificeDronesComponent] });
    fixture = TestBed.createComponent(FormSacrificeDronesComponent);
    emitted = [];
    fixture.componentInstance.submittedCount.subscribe((count) => emitted.push(count));
  });

  it('zeigt Umwandlungsverlust, Obergrenze und Ertrag je Drohne vorab', () => {
    render();
    expect(text('hud.sacrifice.loss')).toBe('Umwandlungsverlust: 50 %');
    expect(text('hud.sacrifice.max')).toBe('Anzahl (höchstens 1.234)');
    expect(text('hud.sacrifice.yield')).toBe('Ertrag je Drohne: 5,0 Nahrung');
    expect(submit().disabled).toBe(true);
  });

  it('zeigt den Ertrag zur gewählten Anzahl, auch mit Tausenderpunkt', () => {
    render();
    type('10');
    expect(text('hud.sacrifice.yield')).toBe('Ertrag: 50 Nahrung');
    type('1.000');
    expect(text('hud.sacrifice.yield')).toBe('Ertrag: 5.000 Nahrung');
    expect(submit().disabled).toBe(false);
    expect(errors()).toEqual([]);
  });

  it('lehnt Bruchteile, 0 und zu viele Drohnen ab', () => {
    render();
    for (const value of ['1,5', '0', 'abc']) {
      type(value);
      expect(errors()).toEqual(['Anzahl als ganze Zahl ab 1 eingeben.']);
      expect(submit().disabled).toBe(true);
    }
    type('1235');
    expect(errors()).toEqual(['Höchstens 1.234 Drohnen vorhanden.']);
    expect(text('hud.sacrifice.yield')).toBe('Ertrag je Drohne: 5,0 Nahrung');
    expect(input().getAttribute('aria-invalid')).toBe('true');
  });

  it('gibt die Anzahl beim Absenden aus und leert das Feld', async () => {
    render();
    type('12');
    submit().click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(emitted).toEqual([12]);
    expect(input().value).toBe('');
    expect(errors()).toEqual([]);
  });

  it('prüft gegen die aktuelle Obergrenze', () => {
    render();
    type('100');
    render({ maxCount: 50 });
    expect(errors()).toEqual(['Höchstens 50 Drohnen vorhanden.']);
    expect(submit().disabled).toBe(true);
  });

  it('sperrt das Feld ohne ganze Drohne', () => {
    render({ maxCount: 0 });
    expect(input().disabled).toBe(true);
    expect(submit().disabled).toBe(true);
  });
});
