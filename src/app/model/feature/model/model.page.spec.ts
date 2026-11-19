import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { runSimulationWithState } from '@app/engine/domain/runner-logic';

import type { SimRequest, SimResponse } from '../../data-access/sim/sim-service.model';
import { SIM_WORKER_FACTORY, SimWorker } from '../../data-access/sim/sim-service.tokens';
import { createActiveBot } from '../../domain/bots/active-bot-logic';
import { createIdleBot } from '../../domain/bots/idle-bot-logic';
import { ReducedRun, reduceResult } from '../../domain/reduce-result-logic';
import { ECHARTS_INIT, EchartInstance } from '../../ui/echart/echart.component';
import type { ChartOption } from '../../ui/model-charts/chart-options';
import { RUN_DEBOUNCE_MS } from '../state/model.facade';
import { provideModelState } from '../state/model.providers';
import { ModelPage } from './model.page';

const HOUR_MS = 3_600_000;

class FakeWorker implements SimWorker {
  onmessage: SimWorker['onmessage'] = null;
  onerror: SimWorker['onerror'] = null;
  onmessageerror: SimWorker['onmessageerror'] = null;
  readonly posted: SimRequest[] = [];
  terminated = false;

  postMessage(request: SimRequest): void {
    this.posted.push(request);
  }

  terminate(): void {
    this.terminated = true;
  }

  send(data: SimResponse): void {
    this.onmessage?.call(this as unknown as Worker, new MessageEvent('message', { data }));
  }
}

function makeRun(kind: 'active' | 'idle', durationMs = HOUR_MS): ReducedRun {
  const bot = kind === 'active' ? createActiveBot() : createIdleBot();
  const { result, state } = runSimulationWithState({
    seed: 'seite',
    bot,
    durationMs,
    sampleEveryMs: 60_000,
  });
  return reduceResult(result, kind, 12, state);
}

describe('ModelPage', () => {
  let workers: FakeWorker[];
  let fixture: ComponentFixture<ModelPage>;
  let zoomHandler: () => void;
  let chart: { [K in keyof EchartInstance]: ReturnType<typeof vi.fn> };
  const active = makeRun('active');
  const idle = makeRun('idle');

  const element = () => fixture.nativeElement as HTMLElement;
  const byTestId = <T extends HTMLElement>(id: string) =>
    element().querySelector<T>(`[data-testid="${id}"]`);
  const lastOption = () => chart.setOption.mock.lastCall?.[0] as ChartOption;
  const lastRequest = () => {
    const { posted } = workers[workers.length - 1];
    return posted[posted.length - 1];
  };

  function settle(): void {
    TestBed.tick();
    fixture.detectChanges();
    TestBed.tick();
  }

  function finishRun(runs: readonly ReducedRun[] = [active, idle]): void {
    const worker = workers[workers.length - 1];
    const { runId } = lastRequest();
    for (const run of runs) {
      worker.send({ type: 'result', runId, run });
    }
    worker.send({ type: 'done', runId });
    settle();
  }

  function type(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    settle();
  }

  const paramInput = (key: string) => element().querySelector(`#param-${key}`) as HTMLInputElement;

  function debounce(): void {
    vi.advanceTimersByTime(RUN_DEBOUNCE_MS);
    settle();
  }

  beforeEach(() => {
    vi.useFakeTimers();
    workers = [];
    chart = {
      setOption: vi.fn(),
      getOption: vi.fn(() => ({ dataZoom: [{ startValue: 60_000, endValue: 120_000 }] })),
      on: vi.fn((_: string, handler: () => void) => (zoomHandler = handler)),
      resize: vi.fn(),
      dispose: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [ModelPage],
      providers: [
        provideModelState(),
        { provide: ECHARTS_INIT, useValue: () => chart },
        {
          provide: SIM_WORKER_FACTORY,
          useValue: () => {
            const worker = new FakeWorker();
            workers.push(worker);
            return worker;
          },
        },
      ],
    });
    fixture = TestBed.createComponent(ModelPage);
    settle();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('startet beim Öffnen einen Lauf mit beiden Bots', () => {
    expect(lastRequest()).toMatchObject({
      seed: 'modell',
      durationMs: 24 * HOUR_MS,
      bots: [{ kind: 'active' }, { kind: 'idle' }],
      params: {},
    });
    expect(byTestId('model.results.status')?.textContent).toContain('0/2');
  });

  it('zeigt alle Konstanten aus DEFAULT_BALANCE', () => {
    const keys = Array.from(element().querySelectorAll('[data-param]'), (node) =>
      node.getAttribute('data-param'),
    );
    expect(keys).toEqual(Object.keys(DEFAULT_BALANCE));
  });

  it('zeigt Diagramm und Kennzahlen nach dem Lauf', () => {
    expect(element().querySelector('app-echart')).toBeNull();
    finishRun();
    expect(lastOption().series.filter((series) => series.type === 'line')).toHaveLength(10);
    const headers = Array.from(
      element().querySelectorAll('app-model-metrics thead th'),
      (th) => th.textContent,
    );
    expect(headers.map((header) => header?.trim())).toEqual(['Kennzahl', 'Aktiv', 'Idle']);
    expect(element().querySelector('tbody')?.textContent).toContain('12 ms');
  });

  it('startet nach einer Änderung entprellt neu und bricht den laufenden Lauf ab', () => {
    type(paramInput('droneCost'), '12');
    type(paramInput('droneCost'), '13');
    vi.advanceTimersByTime(RUN_DEBOUNCE_MS - 1);
    settle();
    expect(workers).toHaveLength(1);
    debounce();
    expect(workers[0].terminated).toBe(true);
    expect(lastRequest().params).toEqual({ droneCost: 13 });
    expect(workers).toHaveLength(2);
  });

  it('markiert Änderungen und setzt sie einzeln zurück', () => {
    finishRun();
    const row = element().querySelector('[data-param="droneCost"]') as HTMLElement;
    type(paramInput('droneCost'), '12');
    expect(row.hasAttribute('data-changed')).toBe(true);
    expect(JSON.parse(byTestId<HTMLTextAreaElement>('model.params.export')?.value ?? '')).toEqual({
      droneCost: 12,
    });

    byTestId('model.params.reset-droneCost')?.click();
    settle();
    expect(row.hasAttribute('data-changed')).toBe(false);
    expect(paramInput('droneCost').value).toBe('10');
    expect(byTestId('model.params.export')).toBeNull();
  });

  it('startet bei ungültigen Eingaben keinen Lauf', () => {
    finishRun();
    const before = workers[0].posted.length;
    type(paramInput('droneCost'), 'abc');
    debounce();
    expect(workers[0].posted).toHaveLength(before);
    expect(byTestId('model.params.form-invalid')).not.toBeNull();
    expect(byTestId<HTMLButtonElement>('model.params.start')?.disabled).toBe(true);
    expect(paramInput('droneCost').getAttribute('aria-invalid')).toBe('true');

    type(byTestId<HTMLInputElement>('model.params.seed') as HTMLInputElement, ' ');
    debounce();
    expect(workers[0].posted).toHaveLength(before);
  });

  it('braucht mindestens einen Bot und startet mit der Auswahl', () => {
    finishRun();
    const toggle = (id: string) => byTestId<HTMLInputElement>(id)?.click();
    toggle('model.params.bot-active');
    settle();
    debounce();
    expect(lastRequest().bots).toEqual([{ kind: 'idle' }]);
    finishRun([idle]);

    toggle('model.params.bot-idle');
    settle();
    expect(byTestId<HTMLButtonElement>('model.params.start')?.disabled).toBe(true);
    toggle('model.params.bot-active');
    settle();
    debounce();
    expect(lastRequest().bots).toEqual([{ kind: 'active' }]);
  });

  it('startet per Knopf sofort und nicht danach noch einmal', () => {
    finishRun();
    type(paramInput('droneCost'), '12');
    byTestId('model.params.start')?.click();
    settle();
    const count = workers[0].posted.length;
    expect(lastRequest().params).toEqual({ droneCost: 12 });
    debounce();
    expect(workers[0].posted).toHaveLength(count);
  });

  it('übernimmt die Dauer', () => {
    finishRun();
    const select = byTestId<HTMLSelectElement>('model.params.duration') as HTMLSelectElement;
    select.value = String(HOUR_MS);
    // Browser melden eine Auswahl als `input` und `change`.
    select.dispatchEvent(new Event('input'));
    select.dispatchEvent(new Event('change'));
    settle();
    debounce();
    expect(lastRequest().durationMs).toBe(HOUR_MS);
  });

  it('hält den Basislauf fest und löscht ihn wieder', () => {
    finishRun();
    expect(byTestId('model.params.clear-baseline')).toBeNull();
    byTestId('model.params.pin')?.click();
    settle();
    const dashed = () =>
      lastOption().series.filter((s) => s.type === 'line' && Array.isArray(s.lineStyle.type));
    expect(dashed()).toHaveLength(10);
    expect(byTestId('model.results.baseline-info')?.textContent).toContain('seite');

    byTestId('model.params.clear-baseline')?.click();
    settle();
    expect(dashed()).toHaveLength(0);
  });

  it('zeigt Fehler aus dem Worker', () => {
    workers[0].send({ type: 'error', runId: lastRequest().runId, message: 'kaputt' });
    settle();
    expect(byTestId('model.results.error')?.textContent).toContain('kaputt');
  });

  it('wechselt Reiter, Achse und Markierungen', () => {
    finishRun();
    byTestId('model.charts.tab-rates')?.click();
    settle();
    expect(lastOption().series.filter((s) => s.type === 'line')).toHaveLength(6);
    expect(byTestId('model.charts.tab-rates')?.getAttribute('aria-selected')).toBe('true');

    byTestId('model.charts.log')?.click();
    settle();
    expect(lastOption().yAxis[0].type).toBe('value');

    const scatter = () => lastOption().series.filter((s) => s.type === 'scatter').length;
    // Sechs Arten (Kauf, leer, Weitergezogen, Adaption, Fund, Drüsenpunkt) je Bot.
    expect(scatter()).toBe(12);
    byTestId('model.charts.marker-buy')?.click();
    settle();
    expect(scatter()).toBe(10);
    byTestId('model.charts.marker-buy')?.click();
    settle();
    expect(scatter()).toBe(12);
  });

  it('zeigt Zielband-Warnungen, Upgrades und den DNA-Fluss', () => {
    finishRun();
    expect(byTestId('model.pacing.active')).not.toBeNull();
    expect(byTestId('model.pacing.idle')).not.toBeNull();
    const rows = element().querySelectorAll('[data-testid="model.upgrades.table"] tbody tr');
    // 15 Genom-Knoten, 4 einzigartige Adaptionen, Drüsenpunkt, Königin, Drohne.
    expect(rows).toHaveLength(22);
    expect(byTestId('model.upgrades.bot-active')?.getAttribute('aria-selected')).toBe('true');
    byTestId('model.upgrades.bot-idle')?.click();
    settle();
    expect(byTestId('model.upgrades.bot-idle')?.getAttribute('aria-selected')).toBe('true');

    byTestId('model.charts.tab-dna')?.click();
    settle();
    expect(lastOption().series.filter((s) => s.type === 'line')).toHaveLength(10);
    expect(byTestId('model.charts.hint-dna')).not.toBeNull();
  });

  it('nennt die Gesamtzahl der Ereignisse', () => {
    const thinned = {
      ...idle,
      eventTotals: { ...idle.eventTotals, buy: 12_345 },
    };
    finishRun([thinned]);
    const shown = idle.events.filter((event) => event.type === 'buy').length;
    expect(byTestId('model.charts.marker-count-buy')?.textContent).toBe(`(${shown} von 12.345)`);
  });

  it('lässt den Wartezeit-Anteil dem Zoom folgen, ohne das Diagramm neu aufzubauen', () => {
    finishRun();
    const calls = chart.setOption.mock.calls.length;
    zoomHandler();
    settle();
    expect(byTestId('model.metrics.range')?.textContent).toContain('1 min – 2 min');
    expect(chart.setOption.mock.calls.length).toBe(calls);

    byTestId('model.charts.log')?.click();
    settle();
    expect(lastOption().dataZoom[0].startValue).toBe(60_000);

    byTestId('model.charts.reset-zoom')?.click();
    settle();
    expect(byTestId('model.metrics.range')?.textContent).toContain('ganzer Lauf');
    expect(lastOption().dataZoom[0].startValue).toBeUndefined();
  });

  it('verwirft den Zoom bei anderer Laufdauer', () => {
    finishRun();
    zoomHandler();
    settle();
    byTestId('model.params.start')?.click();
    settle();
    finishRun([makeRun('idle', 2 * HOUR_MS)]);
    expect(byTestId('model.metrics.range')?.textContent).toContain('ganzer Lauf');
  });

  it('kopiert und lädt den Export', async () => {
    const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error());
    const view = element().ownerDocument.defaultView as Window;
    Object.defineProperty(view.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    type(paramInput('droneCost'), '12');

    byTestId('model.params.copy')?.click();
    await vi.advanceTimersByTimeAsync(0);
    settle();
    expect(writeText).toHaveBeenCalledWith('{\n  "droneCost": 12\n}');
    expect(byTestId('model.params.copy-status')?.textContent?.trim()).toBe('Kopiert.');
    byTestId('model.params.copy')?.click();
    await vi.advanceTimersByTimeAsync(0);
    settle();
    expect(byTestId('model.params.copy-status')?.textContent?.trim()).toBe(
      'Kopieren nicht möglich.',
    );

    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    byTestId('model.params.download')?.click();
    expect(click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
    click.mockRestore();
  });

  it('wertet Stillstände mit der Schwelle aus, ohne einen Lauf zu starten', () => {
    finishRun();
    const before = workers[0].posted.length;
    const threshold = byTestId<HTMLInputElement>('model.stalls.threshold') as HTMLInputElement;
    expect(threshold.value).toBe('60');
    // Ein 1-h-Lauf hat höchstens eine offene Strecke von 1 h; die ist nicht länger als 60 min.
    expect(byTestId('model.stalls.active.empty')?.textContent).toContain(
      'Keine Stillstände über der Schwelle',
    );

    type(threshold, '1');
    debounce();
    expect(workers[0].posted).toHaveLength(before);
    const items = element().querySelectorAll('[data-testid="model.stalls.active.item"]');
    expect(items.length).toBeGreaterThan(0);

    type(threshold, '0');
    expect(byTestId('model.stalls.threshold-error')).not.toBeNull();
    expect(byTestId('model.stalls.active')).toBeNull();
    expect(workers[0].posted).toHaveLength(before);
  });

  it('zeigt die Reiter je Futterstelle ohne Markierungen, mit eigenem Zoom', () => {
    finishRun();
    byTestId('model.charts.tab-siteDuration')?.click();
    settle();
    expect(lastOption().series.every((s) => (s.type as string) === 'bar')).toBe(true);
    expect(byTestId('model.charts.marker-buy')).toBeNull();
    expect(byTestId('model.charts.reset-zoom')).not.toBeNull();
    expect(byTestId('model.charts.log')).toBeNull();

    byTestId('model.charts.tab-soldiers')?.click();
    settle();
    expect(lastOption().series).toHaveLength(6);
    expect(byTestId('model.charts.log')).not.toBeNull();
  });

  it('beendet den Worker beim Verlassen', () => {
    fixture.destroy();
    expect(workers[0].terminated).toBe(true);
  });
});
