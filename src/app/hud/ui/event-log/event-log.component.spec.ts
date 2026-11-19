import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventLogComponent } from './event-log.component';
import type { LogEntryView } from './event-log.component.model';

describe('EventLogComponent', () => {
  let fixture: ComponentFixture<EventLogComponent>;

  const element = () => fixture.nativeElement as HTMLElement;
  const entries = () => [...element().querySelectorAll('[data-testid="hud.log.entry"]')];

  /** Neueste zuerst, wie die Facade sie liefert. */
  function render(ids: number[]): void {
    fixture.componentRef.setInput(
      'entries',
      ids.map((id): LogEntryView => ({
        id,
        event: { type: 'siteDepleted', playedMs: id * 1000, siteType: 'vent' },
        kind: id === 5 ? 'loss' : 'default',
      })),
    );
    fixture.detectChanges();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(EventLogComponent);
  });

  it('zeigt die letzten vier Einträge, das neueste unten', () => {
    render([6, 5, 4, 3, 2, 1]);
    const times = entries().map(
      (entry) => entry.querySelector('[data-testid="hud.log.time"]')?.textContent,
    );
    expect(times).toEqual(['3 s', '4 s', '5 s', '6 s']);
  });

  it('färbt den Text je Art', () => {
    // Älteste zuerst: Eintrag 5 (Verlust) vor Eintrag 6.
    render([6, 5]);
    const [loss, plain] = entries();
    expect(loss.getAttribute('data-kind')).toBe('loss');
    expect(loss.querySelector('[data-testid="hud.log.text"]')?.className).toContain('text-magenta');
    expect(plain.getAttribute('data-kind')).toBe('default');
    expect(plain.querySelector('[data-testid="hud.log.text"]')?.className).toBe('text-fg');
  });

  it('meldet ein leeres Log', () => {
    render([]);
    expect(element().querySelector('[data-testid="hud.log.empty"]')?.textContent?.trim()).toBe(
      'Noch keine Ereignisse.',
    );
  });
});
