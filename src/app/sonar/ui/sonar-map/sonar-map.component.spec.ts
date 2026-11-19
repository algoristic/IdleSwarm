import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import { Num } from '@app/shared/util/num/num';

import { toSonarView } from '../../feature/state/sonar.utils';
import { SonarMapComponent } from './sonar-map.component';

describe('SonarMapComponent', () => {
  let fixture: ComponentFixture<SonarMapComponent>;
  let selected: number[];

  const query = (testId: string) =>
    (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`) as Element;

  beforeEach(() => {
    const state = createInitialState({ seed: 'sonar-map', now: 0 });
    const map = toSonarView(
      {
        state: {
          ...state,
          map: {
            ...state.map,
            candidates: [
              {
                type: 'algal-mat',
                position: { x: 2, y: 0 },
                size: Num.from(1e4),
                defense: Num.ZERO,
              },
              { type: 'vent', position: { x: 0, y: 6.5 }, size: Num.from(1e4), defense: Num.ZERO },
            ],
          },
        },
        selected: 0,
      },
      DEFAULT_BALANCE,
    ).map;
    TestBed.configureTestingModule({ imports: [SonarMapComponent] });
    fixture = TestBed.createComponent(SonarMapComponent);
    fixture.componentRef.setInput('map', map);
    selected = [];
    fixture.componentInstance.selectedTarget.subscribe((index) => selected.push(index));
    fixture.detectChanges();
  });

  it('wählt Ziele per Klick, Enter und Leertaste', () => {
    const target = query('sonar.map.targets.1');
    target.dispatchEvent(new MouseEvent('click'));
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    const space = new KeyboardEvent('keydown', { key: ' ', cancelable: true });
    target.dispatchEvent(space);
    expect(selected).toEqual([1, 1, 1]);
    expect(space.defaultPrevented).toBe(true);
  });

  it('beschreibt Ziele zugänglich und markiert die Auswahl', () => {
    const first = query('sonar.map.targets.0');
    expect(first.getAttribute('role')).toBe('button');
    expect(first.getAttribute('tabindex')).toBe('0');
    expect(first.getAttribute('aria-pressed')).toBe('true');
    expect(first.getAttribute('aria-label')).toContain('Distanz 2');
    expect(first.getAttribute('aria-label')).toContain('einnehmbar');
    expect(query('sonar.map.targets.1').getAttribute('aria-label')).toContain('Unerforschtes Ziel');
    expect(query('sonar.map.route')).not.toBeNull();
  });
});
