import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { GameLoop } from '@app/engine/data-access/game-loop/game-loop.service';
import { GameStore } from '@app/engine/data-access/game-store/game-store.service';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import { HINT_IDS, ONBOARDING_UNLOCK_IDS } from '@app/onboarding/domain/models/onboarding.model';
import { KEY_VALUE_STORE } from '@app/persistence/data-access/persistence/persistence-service.tokens';
import { PersistenceService } from '@app/persistence/data-access/persistence/persistence.service';
import { MotionPreferenceService } from '@app/shared/data-access/motion-preference/motion-preference.service';
import { CLOCK } from '@app/shared/data-access/platform/platform.tokens';

import { shellRoutes } from '../shell.routes';

/** Spielstand für die Shell: alles freigeschaltet und alle Hinweise gesehen, sofern nicht anders. */
function shellState(onboarding: Partial<GameState['onboarding']> = {}): GameState {
  return {
    ...createInitialState({ seed: 'shell', now: 10_000 }),
    onboarding: {
      unlocked: [...ONBOARDING_UNLOCK_IDS],
      seenHints: [...HINT_IDS],
      ...onboarding,
    },
  };
}

function configureShell(now: () => number): void {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(shellRoutes),
      GameStore,
      GameLoop,
      PersistenceService,
      MotionPreferenceService,
      {
        provide: KEY_VALUE_STORE,
        useValue: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined },
      },
      { provide: CLOCK, useValue: { now, monotonic: now } },
    ],
  });
}

describe('ShellPage: Desktop-Eingabe', () => {
  let now: number;
  let harness: RouterTestingHarness;

  const byTestId = (testId: string) =>
    harness.routeNativeElement?.querySelector<HTMLElement>(`[data-testid="${testId}"]`) ?? null;
  const url = () => TestBed.inject(Router).url;

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  async function press(key: string): Promise<void> {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    await settle();
  }

  async function wheel(deltaY: number): Promise<void> {
    byTestId('shell.layer.scene')?.dispatchEvent(
      new WheelEvent('wheel', { deltaY, bubbles: true }),
    );
    await settle();
  }

  beforeEach(async () => {
    now = 10_000;
    configureShell(() => now);
    TestBed.inject(GameStore).load(shellState());
    harness = await RouterTestingHarness.create('/');
  });

  it('wechselt mit dem Mausrad in den Nachbarmodus, mit Sperre', async () => {
    await wheel(100);
    expect(url()).toBe('/umgebung');

    // Am Ende der Reihe passiert nichts; die Sperre läuft noch.
    await wheel(-100);
    expect(url()).toBe('/umgebung');

    now += 900;
    await wheel(-100);
    expect(url()).toBe('/');
    now += 900;
    await wheel(-100);
    expect(url()).toBe('/genom');
  });

  it('wechselt mit W, G und Esc', async () => {
    await press('w');
    expect(url()).toBe('/umgebung');
    await press('g');
    expect(url()).toBe('/genom');
    await press('Escape');
    expect(url()).toBe('/');
  });

  it('schließt mit Esc in der Szene zuerst die offene Schublade', async () => {
    byTestId('hud.drawers.finds.tab')?.click();
    harness.detectChanges();
    expect(byTestId('hud.drawers.finds.panel')?.hasAttribute('data-open')).toBe(true);

    await press('Escape');
    expect(byTestId('hud.drawers.finds.panel')?.hasAttribute('data-open')).toBe(false);
    expect(url()).toBe('/');
  });

  it('gibt den Fokus nach Esc aus der Schublade an ihren Reiter zurück', async () => {
    byTestId('hud.drawers.finds.tab')?.click();
    await settle();
    expect(document.activeElement).toBe(byTestId('hud.drawers.finds.panel'));

    await press('Escape');
    expect(document.activeElement).toBe(byTestId('hud.drawers.finds.tab'));
  });

  it('setzt den Fokus nach einem Moduswechsel auf den Titel des Modus, nicht beim Laden', async () => {
    await settle();
    expect(document.activeElement).toBe(document.body);

    await press('w');
    await settle();
    const mapTitle = byTestId('shell.overlay.map')?.querySelector('app-sonar-title');
    expect(document.activeElement).toBe(mapTitle);
    expect(mapTitle?.getAttribute('aria-label')).toBe('Umgebung');

    byTestId('shell.zoom.gen')?.click();
    await settle();
    expect(document.activeElement?.textContent).toContain('Genom');

    byTestId('shell.back')?.click();
    await settle();
    expect(document.activeElement).toBe(
      byTestId('shell.overlay.scene')?.querySelector('app-feeding-site'),
    );
  });

  it('nennt die Tastenkürzel an der Zoom-Leiste', () => {
    expect(byTestId('shell.zoom.map')?.getAttribute('aria-keyshortcuts')).toBe('W');
    expect(byTestId('shell.zoom.scene')?.getAttribute('aria-keyshortcuts')).toBe('Escape');
    expect(byTestId('shell.zoom.gen')?.getAttribute('aria-keyshortcuts')).toBe('G');
    const lines = [...(byTestId('shell.zoom.hint')?.children ?? [])].map((line) =>
      line.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(lines).toEqual(['Mausrad: zoomen', 'W Umgebung · G Genom · Esc Schwarm']);
  });
});

describe('ShellPage: Onboarding (US-09.04)', () => {
  let now: number;
  let harness: RouterTestingHarness;

  const byTestId = (testId: string) =>
    harness.routeNativeElement?.querySelector<HTMLElement>(`[data-testid="${testId}"]`) ?? null;
  const url = () => TestBed.inject(Router).url;

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  async function press(key: string): Promise<void> {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    await settle();
  }

  async function wheel(deltaY: number): Promise<void> {
    byTestId('shell.layer.scene')?.dispatchEvent(
      new WheelEvent('wheel', { deltaY, bubbles: true }),
    );
    await settle();
  }

  beforeEach(() => {
    now = 10_000;
    configureShell(() => now);
  });

  it('zeigt im neuen Spiel nur die Szene: Rad, W und G wechseln nicht', async () => {
    TestBed.inject(GameStore).load(shellState({ unlocked: [] }));
    harness = await RouterTestingHarness.create('/');
    expect(byTestId('shell.zoom.scene')).not.toBeNull();
    expect(byTestId('shell.zoom.map')).toBeNull();
    expect(byTestId('shell.zoom.gen')).toBeNull();
    expect(byTestId('shell.zoom.hint')).toBeNull();

    await wheel(100);
    now += 900;
    await wheel(-100);
    await press('w');
    await press('g');
    expect(url()).toBe('/');
  });

  it('leitet eine gesperrte Route auf die Szene um', async () => {
    TestBed.inject(GameStore).load(shellState({ unlocked: ['map'] }));
    harness = await RouterTestingHarness.create('/genom');
    expect(url()).toBe('/');
    await harness.navigateByUrl('/umgebung');
    expect(url()).toBe('/umgebung');
  });

  it('überspringt gesperrte Modi und nennt nur erreichbare Tasten', async () => {
    TestBed.inject(GameStore).load(shellState({ unlocked: ['genome'] }));
    harness = await RouterTestingHarness.create('/');
    await wheel(100);
    expect(url()).toBe('/');
    now += 900;
    await wheel(-100);
    expect(url()).toBe('/genom');
    const lines = [...(byTestId('shell.zoom.hint')?.children ?? [])].map((line) =>
      line.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(lines).toEqual(['Mausrad: zoomen', 'G Genom · Esc Schwarm']);
  });

  it('führt zur Szene, wenn ein neues Spiel den aktuellen Modus sperrt', async () => {
    const store = TestBed.inject(GameStore);
    store.load(shellState({ unlocked: ['map'] }));
    harness = await RouterTestingHarness.create('/umgebung');
    store.load(shellState({ unlocked: [] }));
    await settle();
    await settle();
    expect(url()).toBe('/');
  });

  it('zeigt einen Hinweis je Modus, ohne den Fokus zu nehmen, und klickt ihn weg', async () => {
    const store = TestBed.inject(GameStore);
    store.load(shellState({ unlocked: ['map'], seenHints: [] }));
    harness = await RouterTestingHarness.create('/');
    await settle();
    expect(byTestId('onboarding.hint.collect')).not.toBeNull();
    expect(byTestId('onboarding.hint.title')?.textContent?.trim()).toBe('Drohnen sammeln');
    expect(byTestId('onboarding.hint.card')?.closest('[role="status"]')).not.toBeNull();
    expect(document.activeElement).toBe(document.body);

    byTestId('onboarding.hint.dismiss')?.focus();
    byTestId('onboarding.hint.dismiss')?.click();
    await settle();
    expect(store.state().onboarding.seenHints).toEqual(['collect']);
    // Lag der Fokus in der Karte, geht er auf den Titel des Modus statt auf `body`.
    expect(document.activeElement).toBe(
      byTestId('shell.overlay.scene')?.querySelector('app-feeding-site'),
    );
    expect(byTestId('onboarding.hint.map')).not.toBeNull();

    await press('w');
    expect(byTestId('onboarding.hint.auto-move')).not.toBeNull();
    byTestId('onboarding.hint.dismiss')?.click();
    await settle();
    expect(byTestId('onboarding.hint.card')).toBeNull();

    await press('Escape');
    expect(byTestId('onboarding.hint.map')).not.toBeNull();
  });
});
