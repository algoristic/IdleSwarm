import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { GameLoop } from '@app/engine/data-access/game-loop/game-loop.service';
import { GameStore } from '@app/engine/data-access/game-store/game-store.service';
import { SIM_WORKER_FACTORY, SimWorker } from '@app/model/data-access/sim/sim-service.tokens';
import { DEV_BUILD } from '@app/model/feature/state/model.guards';
import { ECHARTS_INIT, EchartInstance } from '@app/model/ui/echart/echart.component';
import { KEY_VALUE_STORE } from '@app/persistence/data-access/persistence/persistence-service.tokens';
import { PersistenceService } from '@app/persistence/data-access/persistence/persistence.service';
import { MotionPreferenceService } from '@app/shared/data-access/motion-preference/motion-preference.service';

import { AppComponent } from './app.component';
import { routes } from './app.routes';

describe('AppComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter(routes),
        // Spielkern ohne App-Initializer: Takt und Autosave laufen im Test nicht.
        GameStore,
        GameLoop,
        PersistenceService,
        MotionPreferenceService,
        {
          provide: KEY_VALUE_STORE,
          useValue: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined },
        },
      ],
    });
  });

  it('enthält nur den Router-Outlet', () => {
    const fixture = TestBed.createComponent(AppComponent);
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

  describe('K2-Shell', () => {
    const shell = (harness: RouterTestingHarness) =>
      harness.routeNativeElement?.querySelector('[data-testid="shell.root"]');
    const byTestId = (harness: RouterTestingHarness, testId: string) =>
      harness.routeNativeElement?.querySelector<HTMLElement>(`[data-testid="${testId}"]`);

    it('setzt den Modus aus der Route schon beim ersten Laden', async () => {
      const harness = await RouterTestingHarness.create('/genom');
      expect(shell(harness)?.getAttribute('data-mode')).toBe('gen');
      expect(byTestId(harness, 'shell.zoom.gen')?.getAttribute('aria-current')).toBe('page');
      expect(byTestId(harness, 'shell.overlay.gen')?.hasAttribute('inert')).toBe(false);
      expect(byTestId(harness, 'shell.overlay.scene')?.hasAttribute('inert')).toBe(true);
    });

    it('behält beim Moduswechsel dieselbe Shell, damit die Übergänge laufen', async () => {
      const harness = await RouterTestingHarness.create('/');
      const root = shell(harness);
      expect(root?.getAttribute('data-mode')).toBe('scene');
      expect(byTestId(harness, 'shell.layer.scene')?.style.transform).toBe('scale(1)');

      byTestId(harness, 'shell.zoom.map')?.click();
      await harness.fixture.whenStable();
      harness.detectChanges();
      expect(TestBed.inject(Router).url).toBe('/umgebung');
      expect(shell(harness)).toBe(root);
      expect(root?.getAttribute('data-mode')).toBe('map');
      expect(byTestId(harness, 'shell.layer.map')?.hasAttribute('inert')).toBe(false);
      expect(byTestId(harness, 'shell.layer.scene')?.style.clipPath).toContain('circle(300px');

      byTestId(harness, 'shell.back')?.click();
      await harness.fixture.whenStable();
      harness.detectChanges();
      expect(TestBed.inject(Router).url).toBe('/');
      expect(shell(harness)).toBe(root);
      expect(root?.getAttribute('data-mode')).toBe('scene');
    });

    it('kehrt per Klick auf die Welt aus der Karte zur Szene zurück', async () => {
      const harness = await RouterTestingHarness.create('/umgebung');
      byTestId(harness, 'shell.world.back')?.click();
      await harness.fixture.whenStable();
      harness.detectChanges();
      expect(shell(harness)?.getAttribute('data-mode')).toBe('scene');
      expect(byTestId(harness, 'shell.world.back')).toBeNull();
    });
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
