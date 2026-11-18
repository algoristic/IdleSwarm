import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { App } from './app';
import { routes } from './app.routes';
import { ECHARTS_INIT, EchartInstance } from './model/charts/echart';
import { DEV_BUILD } from './model/model-route.guard';
import { SIM_WORKER_FACTORY, SimWorker } from './model/sim/sim-client';

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

  describe('Route /modell', () => {
    const modelTitle = 'Modell';
    const heading = (harness: RouterTestingHarness) =>
      harness.routeNativeElement?.querySelector('h1')?.textContent;

    function provide(devBuild: boolean): void {
      TestBed.overrideProvider(DEV_BUILD, { useValue: devBuild });
      TestBed.overrideProvider(SIM_WORKER_FACTORY, {
        useValue: () => ({ postMessage: vi.fn(), terminate: vi.fn() }) as unknown as SimWorker,
      });
      TestBed.overrideProvider(ECHARTS_INIT, {
        useValue: () => ({}) as unknown as EchartInstance,
      });
    }

    it('ist in der Entwicklung immer erreichbar', async () => {
      provide(true);
      expect(heading(await RouterTestingHarness.create('/modell'))).toBe(modelTitle);
    });

    it('leitet im Produktiv-Build ohne Flag auf das HUD um', async () => {
      provide(false);
      const harness = await RouterTestingHarness.create('/modell');
      expect(heading(harness)).toBe('IdleSwarm');
      expect(TestBed.inject(Router).url).toBe('/');
    });

    it('ist im Produktiv-Build mit ?dev erreichbar', async () => {
      provide(false);
      expect(heading(await RouterTestingHarness.create('/modell?dev'))).toBe(modelTitle);
    });

    it('ignoriert andere Parameter im Produktiv-Build', async () => {
      provide(false);
      expect(heading(await RouterTestingHarness.create('/modell?x=1'))).toBe('IdleSwarm');
    });
  });
});
