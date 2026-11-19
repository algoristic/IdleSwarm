import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormMoveSettingsComponent } from './form-move-settings.component';
import type { MoveSettingsView } from './form-move-settings.component.model';

describe('FormMoveSettingsComponent', () => {
  let fixture: ComponentFixture<FormMoveSettingsComponent>;
  let emitted: { kind: string; value: unknown }[];

  const settings: MoveSettingsView = {
    priority: 'balanced',
    strategy: 'balanced',
    autoEnabled: false,
    thresholdPercent: 0,
    maxThresholdPercent: 90,
  };

  const element = () => fixture.nativeElement as HTMLElement;
  const query = <T extends HTMLElement>(testId: string) =>
    element().querySelector(`[data-testid="${testId}"]`) as T;
  const threshold = () => query<HTMLInputElement>('sonar.auto.threshold');

  function render(value: Partial<MoveSettingsView> = {}): void {
    fixture.componentRef.setInput('settings', { ...settings, ...value });
    fixture.detectChanges();
  }

  function typeThreshold(text: string): void {
    threshold().value = text;
    threshold().dispatchEvent(new Event('input'));
    threshold().dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FormMoveSettingsComponent] });
    fixture = TestBed.createComponent(FormMoveSettingsComponent);
    emitted = [];
    const component = fixture.componentInstance;
    component.changedPriority.subscribe((value) => emitted.push({ kind: 'priority', value }));
    component.changedStrategy.subscribe((value) => emitted.push({ kind: 'strategy', value }));
    component.changedAutoEnabled.subscribe((value) => emitted.push({ kind: 'auto', value }));
    component.changedThresholdPercent.subscribe((value) =>
      emitted.push({ kind: 'threshold', value }),
    );
    render();
  });

  it('zeigt die Einstellungen aus dem Spielstand', () => {
    render({ priority: 'soldiers-first', strategy: 'battle-hardened', thresholdPercent: 30 });
    expect(query<HTMLSelectElement>('sonar.settings.priority').value).toBe('soldiers-first');
    expect(query<HTMLInputElement>('sonar.settings.strategy.battle-hardened').checked).toBe(true);
    expect(query<HTMLInputElement>('sonar.auto.enabled').checked).toBe(false);
    expect(threshold().value).toBe('30');
  });

  it('meldet Priorität, Strategie und Auto sofort', () => {
    const select = query<HTMLSelectElement>('sonar.settings.priority');
    select.value = 'drones-first';
    select.dispatchEvent(new Event('input'));
    select.dispatchEvent(new Event('change'));
    query<HTMLInputElement>('sonar.settings.strategy.least-resistance').click();
    query<HTMLInputElement>('sonar.auto.enabled').click();

    expect(emitted).toEqual([
      { kind: 'priority', value: 'drones-first' },
      { kind: 'strategy', value: 'least-resistance' },
      { kind: 'auto', value: true },
    ]);
  });

  it('meldet nur gültige, geänderte Schwellen in ganzen Prozent', () => {
    typeThreshold('25');
    typeThreshold('95');
    typeThreshold('12,5');
    typeThreshold('0');

    expect(emitted).toEqual([{ kind: 'threshold', value: 25 }]);
    expect(query('sonar.auto.threshold-error')).toBeNull();
  });

  it('zeigt bei ungültiger Schwelle einen Fehler', () => {
    typeThreshold('95');
    expect(threshold().getAttribute('aria-invalid')).toBe('true');
    expect(query('sonar.auto.threshold-error').textContent?.trim()).toBe(
      'Ganze Zahl von 0 bis 90 eingeben.',
    );
  });

  it('setzt das Formular nur zurück, wenn sich die Einstellungen ändern', () => {
    typeThreshold('4');
    // Neues Viewmodel mit denselben Werten, wie bei jedem Tick: Die Eingabe bleibt.
    threshold().value = '7';
    threshold().dispatchEvent(new Event('input'));
    render();
    expect(threshold().value).toBe('7');

    render({ thresholdPercent: 4 });
    expect(threshold().value).toBe('4');
  });
});
