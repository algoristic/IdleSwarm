import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { TimeRange } from '../wait-share';
import { Echart, ECHARTS_INIT, EchartInstance } from './echart';

@Component({
  imports: [Echart],
  template: `<app-echart [option]="option()" (zoomChange)="zoom = $event" />`,
})
class Host {
  readonly option = signal<Record<string, unknown>>({ title: 'a' });
  zoom: TimeRange | null = null;
}

describe('Echart', () => {
  let observers: { callback: () => void; disconnect: ReturnType<typeof vi.fn> }[];
  let zoomHandler: () => void;
  let zoomState: unknown;
  let chart: { [K in keyof EchartInstance]: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    observers = [];
    zoomState = {};
    chart = {
      setOption: vi.fn(),
      getOption: vi.fn(() => zoomState),
      on: vi.fn((_: string, handler: () => void) => (zoomHandler = handler)),
      resize: vi.fn(),
      dispose: vi.fn(),
    };
    vi.stubGlobal(
      'ResizeObserver',
      class {
        readonly disconnect = vi.fn();
        constructor(callback: () => void) {
          observers.push({ callback, disconnect: this.disconnect });
        }
        observe = vi.fn();
      },
    );
    TestBed.configureTestingModule({
      providers: [{ provide: ECHARTS_INIT, useValue: () => chart }],
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  function create() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    TestBed.tick();
    return fixture;
  }

  it('setzt Optionen und ersetzt dabei Reihen und Achsen', () => {
    const fixture = create();
    expect(chart.setOption).toHaveBeenCalledTimes(1);
    fixture.componentInstance.option.set({ title: 'b' });
    TestBed.tick();
    expect(chart.setOption).toHaveBeenLastCalledWith(
      { title: 'b' },
      { replaceMerge: ['series', 'xAxis', 'yAxis', 'dataZoom'] },
    );
  });

  it('meldet den Zoom-Ausschnitt', () => {
    const fixture = create();
    zoomHandler();
    expect(fixture.componentInstance.zoom).toBeNull();
    zoomState = { dataZoom: [{ startValue: 10, endValue: 20 }] };
    zoomHandler();
    expect(fixture.componentInstance.zoom).toEqual({ fromMs: 10, toMs: 20 });
  });

  it('passt die Größe an und räumt auf', () => {
    const fixture = create();
    observers[0].callback();
    expect(chart.resize).toHaveBeenCalled();
    fixture.destroy();
    expect(observers[0].disconnect).toHaveBeenCalled();
    expect(chart.dispose).toHaveBeenCalled();
  });

  it('funktioniert ohne ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const fixture = create();
    expect(chart.setOption).toHaveBeenCalled();
    fixture.destroy();
    expect(chart.dispose).toHaveBeenCalled();
  });
});
