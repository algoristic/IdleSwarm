import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

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
      type: 'vent',
      rate: Num.from(1.5),
      stock: Num.from(5000),
      size: Num.from(20_000),
      stockPercent: 25,
      secondsLeft: Num.from(3333),
      empty: false,
      travel: null,
      ...site,
    } satisfies SiteView);
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FeedingSiteComponent],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(FeedingSiteComponent);
  });

  it('zeigt Nahrungsrate, Vorrat, Balkenwerte und Restzeit', () => {
    render();

    expect(text('hud.site.type')).toBe('Hydrothermaler Schlot');
    expect(text('hud.site.rate')).toBe('+1,5/s');
    expect(text('hud.site.stock')).toBe('5.000 / 20.000');
    expect(meter().getAttribute('aria-valuenow')).toBe('25');
    expect(meter().getAttribute('aria-valuemin')).toBe('0');
    expect(meter().getAttribute('aria-valuemax')).toBe('100');
    expect(meter().getAttribute('aria-valuetext')).toBe('5.000 / 20.000');
    expect(meter().getAttribute('aria-label')).toBe('Vorrat');
    expect(text('hud.site.time-left')).toBe('leer in ~55 min 33 s');
  });

  it('ist ohne leeren Vorrat keine Klickfläche', () => {
    render();
    expect(element().querySelectorAll('button')).toHaveLength(0);
    expect(status()).toBe('');
    expect(query('hud.site.move-link')).toBeNull();
  });

  it('zeigt einen Rest im Vorrat nicht als 0', () => {
    render({ stock: Num.from(0.4) });
    expect(text('hud.site.stock')).toBe('1 / 20.000');
  });

  it('schätzt ohne Abbau keine Restzeit', () => {
    render({ secondsLeft: null });
    expect(text('hud.site.time-left')).toBe('Keine Schätzung: Es wird nichts abgebaut.');
  });

  it('meldet den leeren Vorrat ohne Restzeit und ohne Knopf', () => {
    render({ stock: Num.ZERO, stockPercent: 0, empty: true });

    expect(status()).toBe(
      'Die Futterstelle ist leer. Grundertrag und Drohnen bringen nichts mehr.',
    );
    expect(text('hud.site.stock')).toBe('0 / 20.000');
    expect(query('hud.site.time-left')).toBeNull();
    expect(element().querySelectorAll('button')).toHaveLength(0);
  });

  it('bietet bei leerem Vorrat das Weiterziehen an', () => {
    render({ stock: Num.ZERO, stockPercent: 0, empty: true });
    expect(query<HTMLAnchorElement>('hud.site.move-link')?.getAttribute('href')).toBe('/umgebung');
  });

  it('zeigt während der Reise Ziel und Restzeit statt Vorrat und Weiterziehen', () => {
    render({
      stock: Num.ZERO,
      stockPercent: 0,
      empty: true,
      travel: { target: 'whale-fall', secondsLeft: Num.from(24.2) },
    });

    expect(text('hud.site.travel')?.replace(/\s+/g, ' ')).toBe(
      'Unterwegs nach Walsturz, Ankunft in etwa 25 s',
    );
    expect(status()).toBe('Der Schwarm ist unterwegs nach Walsturz.');
    expect(query('hud.site.stock')).toBeNull();
    expect(query('hud.site.time-left')).toBeNull();
    expect(query('hud.site.move-link')).toBeNull();
    expect(text('hud.site.rate')).toBe('+1,5/s');
  });
});
