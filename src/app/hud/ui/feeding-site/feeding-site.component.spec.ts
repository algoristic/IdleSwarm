import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Num } from '@app/shared/util/num/num';

import { FeedingSiteComponent } from './feeding-site.component';
import type { SiteView } from './feeding-site.component.model';

describe('FeedingSiteComponent', () => {
  let fixture: ComponentFixture<FeedingSiteComponent>;

  const element = () => fixture.nativeElement as HTMLElement;
  const query = <T extends HTMLElement>(testId: string) =>
    element().querySelector<T>(`[data-testid="${testId}"]`);
  const text = (testId: string) => query(testId)?.textContent?.trim();
  const meter = () => element().querySelector('[role="progressbar"]') as HTMLElement;
  const status = () => element().querySelector('[role="status"]')?.textContent?.trim();

  function render(site: Partial<SiteView> = {}): void {
    fixture.componentRef.setInput('site', {
      rate: Num.from(1.5),
      stock: Num.from(5000),
      size: Num.from(20_000),
      stockPercent: 25,
      secondsLeft: Num.from(3333),
      empty: false,
      ...site,
    } satisfies SiteView);
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FeedingSiteComponent] });
    fixture = TestBed.createComponent(FeedingSiteComponent);
  });

  it('zeigt Nahrungsrate, Vorrat, Balkenwerte und Restzeit', () => {
    render();

    expect(text('hud.site.rate')).toBe('1,5 Nahrung/s');
    expect(text('hud.site.stock')).toBe('5.000 / 20.000');
    expect(meter().getAttribute('aria-valuenow')).toBe('25');
    expect(meter().getAttribute('aria-valuemin')).toBe('0');
    expect(meter().getAttribute('aria-valuemax')).toBe('100');
    expect(meter().getAttribute('aria-valuetext')).toBe('5.000 / 20.000');
    expect(meter().getAttribute('aria-label')).toBe('Vorrat');
    expect(text('hud.site.time-left')).toBe('Leer in etwa 55 min 33 s');
  });

  it('ist ohne leeren Vorrat keine Klickfläche', () => {
    render();
    expect(element().querySelectorAll('button')).toHaveLength(0);
    expect(status()).toBe('');
  });

  it('zeigt einen Rest im Vorrat nicht als 0', () => {
    render({ stock: Num.from(0.4) });
    expect(text('hud.site.stock')).toBe('1 / 20.000');
  });

  it('schätzt ohne Abbau keine Restzeit', () => {
    render({ secondsLeft: null });
    expect(text('hud.site.time-left')).toBe('Keine Schätzung: Es wird nichts abgebaut.');
  });

  it('bietet bei leerem Vorrat die neue Futterstelle an', () => {
    render({ stock: Num.ZERO, stockPercent: 0, empty: true });

    expect(text('hud.site.renew')).toBe('Neue Futterstelle');
    expect(status()).toBe(
      'Die Futterstelle ist leer. Grundertrag und Drohnen bringen nichts mehr.',
    );
    expect(query('hud.site.time-left')).toBeNull();
  });

  it('meldet das Erneuern und setzt den Fokus auf die Überschrift', () => {
    document.body.append(element());
    render({ stock: Num.ZERO, stockPercent: 0, empty: true });
    const clicked = vi.fn();
    fixture.componentInstance.clickedRenew.subscribe(clicked);

    query<HTMLButtonElement>('hud.site.renew')?.click();

    expect(clicked).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(element().querySelector('#site-title'));
    element().remove();
  });
});
