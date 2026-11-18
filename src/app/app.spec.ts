import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [App], providers: [provideRouter(routes)] });
  });

  it('enthält nur den Router-Outlet', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(Array.from(element.children, (child) => child.tagName)).toEqual(['ROUTER-OUTLET']);
  });

  it('lädt auf der Default-Route das HUD', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('IdleSwarm');
  });

  it('leitet unbekannte Pfade auf das HUD um', async () => {
    const harness = await RouterTestingHarness.create('/gibt-es-nicht');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('IdleSwarm');
  });
});
