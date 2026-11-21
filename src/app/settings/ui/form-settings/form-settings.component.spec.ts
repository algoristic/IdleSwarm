import { TestBed } from '@angular/core/testing';

import { DEFAULT_SETTINGS } from '../../domain/models/settings.model';
import type { SettingsPatch } from '../../domain/settings-logic';
import { FormSettingsComponent } from './form-settings.component';

describe('FormSettingsComponent', () => {
  function setup(): { root: HTMLElement; changes: SettingsPatch[] } {
    const fixture = TestBed.createComponent(FormSettingsComponent);
    fixture.componentRef.setInput('settings', DEFAULT_SETTINGS);
    const changes: SettingsPatch[] = [];
    fixture.componentInstance.changedSettings.subscribe((patch) => changes.push(patch));
    fixture.detectChanges();
    return { root: fixture.nativeElement as HTMLElement, changes };
  }

  function radio(root: HTMLElement, testId: string): HTMLInputElement {
    const element = root.querySelector(`[data-testid="${testId}"]`);
    if (!(element instanceof HTMLInputElement)) {
      throw new Error(`fehlt: ${testId}`);
    }
    return element;
  }

  it('zeigt die gespeicherten Einstellungen als Auswahl', () => {
    const { root } = setup();
    expect(radio(root, 'settings.number-format.short').checked).toBe(true);
    expect(radio(root, 'settings.motion.system').checked).toBe(true);
    expect(radio(root, 'settings.autosave.30000').checked).toBe(true);
  });

  it('meldet eine Auswahl sofort, das Intervall als Zahl', () => {
    const { root, changes } = setup();

    radio(root, 'settings.autosave.10000').click();
    radio(root, 'settings.number-format.engineering').click();

    expect(changes).toEqual([
      { numberFormat: 'short', motion: 'system', autosaveIntervalMs: 10_000 },
      { numberFormat: 'engineering', motion: 'system', autosaveIntervalMs: 10_000 },
    ]);
  });
});
