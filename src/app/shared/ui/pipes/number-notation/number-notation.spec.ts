import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { Notation } from '../../../util/format/format';
import { Num } from '../../../util/num/num';
import { FormatDownPipe } from '../format-down/format-down.pipe';
import { FormatNumPipe } from '../format-num/format-num.pipe';
import { NotationMemo } from './notation-memo';
import { NUMBER_NOTATION } from './number-notation.token';

const VALUE = Num.from('1.2345e10');

@Component({
  imports: [FormatDownPipe, FormatNumPipe],
  template: `<p>{{ value | formatNum }}</p>
    <p>{{ value | formatDown }}</p>
    <p>{{ value | formatNum: 'scientific' }}</p>`,
})
class HostComponent {
  value = VALUE;
}

describe('Zahlen-Pipes und NUMBER_NOTATION', () => {
  it('folgen einem Wechsel der Notation, obwohl der Wert gleich bleibt', async () => {
    const notation = signal<Notation>('short');
    TestBed.configureTestingModule({
      providers: [{ provide: NUMBER_NOTATION, useValue: notation.asReadonly() }],
    });
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const texts = (): string[] =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('p'), (p) =>
        (p.textContent ?? '').trim(),
      );
    expect(texts()).toEqual(['12,35 Mrd.', '12,34 Mrd.', '1,23e10']);

    notation.set('engineering');
    await fixture.whenStable();
    expect(texts()).toEqual(['12,35e9', '12,34e9', '1,23e10']);
  });

  it('nutzt ohne Bereitstellung Kurzformen', () => {
    expect(TestBed.inject(NUMBER_NOTATION)()).toBe('short');
  });

  it('formatiert bei gleichem Wert und gleicher Notation nicht erneut', () => {
    const format = vi.fn(() => 'x');
    const memo = new NotationMemo<number>(format);
    memo.format(1, 'short');
    memo.format(1, 'short');
    memo.format(1, 'scientific');
    memo.format(2, 'scientific');
    expect(format).toHaveBeenCalledTimes(3);
  });
});
