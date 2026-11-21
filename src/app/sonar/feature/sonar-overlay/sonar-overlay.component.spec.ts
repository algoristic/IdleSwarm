import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GameStore } from '@app/engine/data-access/game-store/game-store.service';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import { Num } from '@app/shared/util/num/num';
import type { SiteCandidate } from '@app/site/domain/models/map.model';

import { SonarLayerComponent } from '../sonar-layer/sonar-layer.component';
import { provideSonarState } from '../state/sonar.providers';
import { SonarOverlayComponent } from './sonar-overlay.component';

const candidate = (type: SiteCandidate['type'], x: number, defense: number): SiteCandidate => ({
  type,
  position: { x, y: 0 },
  size: Num.from(10_000),
  defense: Num.from(defense),
});

/** Die Shell zeigt Karten-Ebene und Overlay zusammen; beide teilen die Auswahl. */
@Component({
  imports: [SonarLayerComponent, SonarOverlayComponent],
  template: '<app-sonar-layer /><app-sonar-overlay />',
})
class SonarHostComponent {}

describe('SonarLayerComponent und SonarOverlayComponent', () => {
  let store: GameStore;
  let fixture: ComponentFixture<SonarHostComponent>;

  const element = () => fixture.nativeElement as HTMLElement;
  const query = <T extends HTMLElement>(testId: string) =>
    element().querySelector(`[data-testid="${testId}"]`) as T | null;
  const text = (testId: string) => query(testId)?.textContent?.replace(/\s+/g, ' ').trim();

  function setUnits(units: { queens: number; drones: number; soldiers: number }): void {
    store.replace({
      ...store.state(),
      priority: 'drones-first',
      units: {
        queens: Num.from(units.queens),
        drones: Num.from(units.drones),
        soldiers: Num.from(units.soldiers),
      },
    });
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SonarHostComponent],
      providers: [provideRouter([]), GameStore, provideSonarState()],
    });
    store = TestBed.inject(GameStore);
    const state = createInitialState({ seed: 'sonar-page', now: 0 });
    store.replace({
      ...state,
      map: {
        ...state.map,
        candidates: [
          candidate('algal-mat', 2, 0),
          candidate('vent', 3, 26),
          candidate('whale-fall', 6.5, 10),
        ],
      },
    });
    fixture = TestBed.createComponent(SonarHostComponent);
    fixture.detectChanges();
  });

  it('zeigt die Ziele und im Detailpanel zunächst das Ziel der Strategie', () => {
    expect(text('sonar.targets.0.type')).toBe('Algenmatte');
    expect(text('sonar.targets.0.strategy-choice')).toBe('◆ Strategie wählt dieses Ziel');
    expect(text('sonar.targets.1.verdict')).toBe('✗ zu stark – mehr Soldaten nötig');
    expect(text('sonar.targets.2.type')).toBe('?');
    expect(text('sonar.detail.type')).toBe('Algenmatte');
    expect(text('sonar.detail.losses')).toBe('keine');
    expect(text('sonar.detail.forfeit')).toBe(
      'Beim Aufbruch verfällt der Restvorrat von 30.000 Nahrung.',
    );
  });

  it('erklärt das Strategieziel in der Legende und nennt die Mitnahme in Ein- und Mehrzahl', () => {
    // Geschützte Leerzeichen: kein Umbruch zwischen „◆“ und „=“.
    expect(query('sonar.map.legend.strategy')?.textContent).toContain(
      '◆\u00a0=\u00a0Ziel der Strategie',
    );
    setUnits({ queens: 1, drones: 24, soldiers: 1 });

    expect(text('sonar.transport.carried')).toBe('Kommen mit: 24 Drohnen, 0 Soldaten');
    expect(text('sonar.transport.left-behind')).toBe('Bleiben zurück und gehen verloren: 1 Soldat');
    setUnits({ queens: 1, drones: 26, soldiers: 1 });
    expect(text('sonar.transport.left-behind')).toBe(
      'Bleiben zurück und gehen verloren: 1 Drohne und 1 Soldat',
    );
  });

  it('zeigt Standort, Reichweite und was ohne Entscheidung passiert', () => {
    expect(text('sonar.status.range')).toBe('Umgebung · Reichweite 5');
    expect(text('sonar.status.site')).toContain(
      'Hydrothermaler Schlot Vorrat 30.000 / 30.000 (100 %)',
    );
    expect(text('sonar.note')).toContain(
      'Auto-Weiterziehen ist aus: Ohne Entscheidung bleibt der Schwarm hier.',
    );

    store.replace({ ...store.state(), auto: { ...store.state().auto, enabled: true } });
    fixture.detectChanges();
    expect(text('sonar.note')).toContain(
      'Ohne Entscheidung zieht der Schwarm bei leerem Vorrat nach Strategie „Ausgewogen“ weiter.',
    );
  });

  it('schaltet die Strategie über den Umschalter im Titel', () => {
    const button = (id: string) => query(`sonar.settings.strategy.${id}`);
    expect(button('balanced')?.getAttribute('aria-pressed')).toBe('true');

    button('battle-hardened')?.click();
    fixture.detectChanges();

    expect(store.state().auto.strategy).toBe('battle-hardened');
    expect(button('battle-hardened')?.getAttribute('aria-pressed')).toBe('true');
    expect(button('balanced')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('nennt für unerforschte Ziele einen eigenen Sperrgrund', () => {
    query('sonar.targets.2.select')?.click();
    fixture.detectChanges();

    expect(text('sonar.detail.blocker')).toBe(
      'Das Ziel ist unerforscht und lässt sich noch nicht ansteuern.',
    );
  });

  it('nennt den Grund, warum ein ausgewähltes Ziel gesperrt ist', () => {
    query('sonar.targets.1.select')?.click();
    fixture.detectChanges();

    expect(text('sonar.detail.type')).toBe('Hydrothermaler Schlot');
    expect(text('sonar.detail.losses')).toBe('–');
    expect(query<HTMLButtonElement>('sonar.detail.depart')?.disabled).toBe(true);
    expect(text('sonar.detail.blocker')).toContain('Die Abwehr ist zu stark.');
  });

  it('bricht zum ausgewählten Ziel auf', () => {
    query('sonar.targets.0.select')?.click();
    fixture.detectChanges();
    query('sonar.detail.depart')?.click();
    fixture.detectChanges();

    expect(store.state().travel?.target.type).toBe('algal-mat');
    expect(text('sonar.status.travel')).toContain('Unterwegs nach Algenmatte');
    expect(text('sonar.detail.blocker')).toBe('Der Schwarm ist schon unterwegs.');
    expect(query('sonar.detail.forfeit')).toBeNull();
    expect(text('sonar.status.new-targets')).toBe('Nach der Ankunft gibt es neue Ziele.');
    expect(query('sonar.map.legend.strategy')).toBeNull();
    expect(query('sonar.targets.stale')).not.toBeNull();
    expect(query('sonar.targets.0.strategy-choice')).toBeNull();
    expect(query('sonar.targets.0.verdict')?.hasAttribute('data-stale')).toBe(true);
    expect(query('sonar.transport.carried')).toBeNull();
    expect(query('sonar.transport.after-arrival')).not.toBeNull();
  });
});
