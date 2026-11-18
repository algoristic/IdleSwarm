import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DEFAULT_BALANCE } from '../core/balance/constants';
import { createActiveBot } from '../core/sim/bots/active';
import { createIdleBot } from '../core/sim/bots/idle';
import { runSimulation } from '../core/sim/runner';
import type { ChartOption } from './charts/chart-options';
import { ECHARTS_INIT, EchartInstance } from './charts/echart';
import { ModelPage, RUN_DEBOUNCE_MS } from './model-page';
import { MODEL_TEXTS } from './model-texts.de';
import { ReducedRun, reduceResult } from './sim/reduce-result';
import { SIM_WORKER_FACTORY, SimWorker } from './sim/sim-client';
import type { SimRequest, SimResponse } from './sim/sim-protocol';

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
  const result = runSimulation({ seed: 'seite', bot, durationMs, sampleEveryMs: 60_000 });
  return reduceResult(result, kind, 12);
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
    expect(byTestId('status')?.textContent).toContain('0/2');
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
    const headers = Array.from(element().querySelectorAll('thead th'), (th) => th.textContent);
    expect(headers).toEqual([MODEL_TEXTS.metric, 'Aktiv', 'Idle']);
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
    expect(row.classList.contains('changed')).toBe(true);
    expect(JSON.parse(byTestId<HTMLTextAreaElement>('export')?.value ?? '')).toEqual({
      droneCost: 12,
    });

    row.querySelector<HTMLButtonElement>('.reset')?.click();
    settle();
    expect(row.classList.contains('changed')).toBe(false);
    expect(paramInput('droneCost').value).toBe('10');
    expect(byTestId('export')).toBeNull();
  });

  it('startet bei ungültigen Eingaben keinen Lauf', () => {
    finishRun();
    const before = workers[0].posted.length;
    type(paramInput('droneCost'), 'abc');
    debounce();
    expect(workers[0].posted).toHaveLength(before);
    expect(byTestId('form-invalid')).not.toBeNull();
    expect(byTestId<HTMLButtonElement>('start')?.disabled).toBe(true);
    expect(paramInput('droneCost').getAttribute('aria-invalid')).toBe('true');

    type(byTestId<HTMLInputElement>('seed') as HTMLInputElement, ' ');
    debounce();
    expect(workers[0].posted).toHaveLength(before);
  });

  it('braucht mindestens einen Bot und startet mit der Auswahl', () => {
    finishRun();
    const toggle = (id: string) => byTestId<HTMLInputElement>(id)?.click();
    toggle('bot-active');
    settle();
    debounce();
    expect(lastRequest().bots).toEqual([{ kind: 'idle' }]);
    finishRun([idle]);

    toggle('bot-idle');
    settle();
    expect(byTestId<HTMLButtonElement>('start')?.disabled).toBe(true);
    toggle('bot-active');
    settle();
    debounce();
    expect(lastRequest().bots).toEqual([{ kind: 'active' }]);
  });

  it('startet per Knopf sofort und nicht danach noch einmal', () => {
    finishRun();
    type(paramInput('droneCost'), '12');
    byTestId('start')?.click();
    settle();
    const count = workers[0].posted.length;
    expect(lastRequest().params).toEqual({ droneCost: 12 });
    debounce();
    expect(workers[0].posted).toHaveLength(count);
  });

  it('übernimmt die Dauer', () => {
    finishRun();
    const select = byTestId<HTMLSelectElement>('duration') as HTMLSelectElement;
    select.value = String(HOUR_MS);
    select.dispatchEvent(new Event('change'));
    settle();
    debounce();
    expect(lastRequest().durationMs).toBe(HOUR_MS);
  });

  it('hält den Basislauf fest und löscht ihn wieder', () => {
    finishRun();
    expect(byTestId('clear-baseline')).toBeNull();
    byTestId('pin')?.click();
    settle();
    const dashed = () =>
      lastOption().series.filter((s) => s.type === 'line' && Array.isArray(s.lineStyle.type));
    expect(dashed()).toHaveLength(10);
    expect(byTestId('baseline-info')?.textContent).toContain('seite');

    byTestId('clear-baseline')?.click();
    settle();
    expect(dashed()).toHaveLength(0);
  });

  it('zeigt Fehler aus dem Worker', () => {
    workers[0].send({ type: 'error', runId: lastRequest().runId, message: 'kaputt' });
    settle();
    expect(byTestId('error')?.textContent).toContain('kaputt');
  });

  it('wechselt Reiter, Achse und Markierungen', () => {
    finishRun();
    byTestId('tab-rates')?.click();
    settle();
    expect(lastOption().series.filter((s) => s.type === 'line')).toHaveLength(6);
    expect(byTestId('tab-rates')?.getAttribute('aria-selected')).toBe('true');

    byTestId('log')?.click();
    settle();
    expect(lastOption().yAxis[0].type).toBe('value');

    const scatter = () => lastOption().series.filter((s) => s.type === 'scatter').length;
    expect(scatter()).toBe(6);
    byTestId('marker-buy')?.click();
    settle();
    expect(scatter()).toBe(4);
    byTestId('marker-buy')?.click();
    settle();
    expect(scatter()).toBe(6);
  });

  it('nennt die Gesamtzahl der Ereignisse', () => {
    const thinned = {
      ...idle,
      eventTotals: { ...idle.eventTotals, buy: 12_345 },
    };
    finishRun([thinned]);
    const shown = idle.events.filter((event) => event.type === 'buy').length;
    expect(byTestId('marker-count-buy')?.textContent).toBe(`(${shown} von 12.345)`);
  });

  it('lässt den Wartezeit-Anteil dem Zoom folgen, ohne das Diagramm neu aufzubauen', () => {
    finishRun();
    const calls = chart.setOption.mock.calls.length;
    zoomHandler();
    settle();
    expect(byTestId('range')?.textContent).toContain('1 min – 2 min');
    expect(chart.setOption.mock.calls.length).toBe(calls);

    byTestId('log')?.click();
    settle();
    expect(lastOption().dataZoom[0].startValue).toBe(60_000);

    byTestId('reset-zoom')?.click();
    settle();
    expect(byTestId('range')?.textContent).toContain(MODEL_TEXTS.rangeAll);
    expect(lastOption().dataZoom[0].startValue).toBeUndefined();
  });

  it('verwirft den Zoom bei anderer Laufdauer', () => {
    finishRun();
    zoomHandler();
    settle();
    byTestId('start')?.click();
    settle();
    finishRun([makeRun('idle', 2 * HOUR_MS)]);
    expect(byTestId('range')?.textContent).toContain(MODEL_TEXTS.rangeAll);
  });

  it('kopiert und lädt den Export', async () => {
    const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error());
    const view = element().ownerDocument.defaultView as Window;
    Object.defineProperty(view.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    type(paramInput('droneCost'), '12');

    byTestId('copy')?.click();
    await vi.advanceTimersByTimeAsync(0);
    settle();
    expect(writeText).toHaveBeenCalledWith('{\n  "droneCost": 12\n}');
    expect(element().querySelector('section [role="status"]')?.textContent).toBe(
      MODEL_TEXTS.copied,
    );
    byTestId('copy')?.click();
    await vi.advanceTimersByTimeAsync(0);
    settle();
    expect(element().querySelector('section [role="status"]')?.textContent).toBe(
      MODEL_TEXTS.copyFailed,
    );

    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    byTestId('download')?.click();
    expect(click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
    click.mockRestore();
  });

  it('beendet den Worker beim Verlassen', () => {
    fixture.destroy();
    expect(workers[0].terminated).toBe(true);
  });
});
