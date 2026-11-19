import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Num } from '@app/shared/util/num/num';

import type { ShellMode } from '../../domain/models/shell-mode.model';
import { ZoomBarComponent } from './zoom-bar.component';

describe('ZoomBarComponent', () => {
  let fixture: ComponentFixture<ZoomBarComponent>;

  const element = () => fixture.nativeElement as HTMLElement;
  const query = (testId: string) =>
    element().querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;

  function render(mode: ShellMode, dna: number, available: number): void {
    fixture.componentRef.setInput('mode', mode);
    fixture.componentRef.setInput('dna', Num.from(dna));
    fixture.componentRef.setInput('availableAdaptations', available);
    fixture.detectChanges();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(ZoomBarComponent);
  });

  it('markiert nur den aktiven Modus', () => {
    render('map', 0, 0);
    expect(query('shell.zoom.map')?.getAttribute('aria-current')).toBe('page');
    expect(query('shell.zoom.scene')?.hasAttribute('aria-current')).toBe(false);
    expect(query('shell.zoom.gen')?.hasAttribute('aria-current')).toBe(false);
  });

  it('zeigt DNA abgerundet und zählt bezahlbare Adaptionen erst ab einer', () => {
    render('scene', 37.9, 0);
    expect(query('shell.zoom.gen-dna')?.textContent?.trim()).toBe('37 DNA');
    expect(query('shell.zoom.gen-count')).toBeNull();

    render('scene', 37.9, 3);
    const count = query('shell.zoom.gen-count');
    expect(count?.querySelector('[aria-hidden="true"]')?.textContent?.trim()).toBe('3');
    expect(count?.querySelector('.sr-only')?.textContent?.trim()).toBe('3 Adaptionen verfügbar');
  });

  it('meldet den gewählten Modus', () => {
    render('scene', 0, 0);
    const selected: ShellMode[] = [];
    fixture.componentInstance.selectedMode.subscribe((mode) => selected.push(mode));
    query('shell.zoom.gen')?.click();
    query('shell.zoom.map')?.click();
    expect(selected).toEqual(['gen', 'map']);
  });
});
