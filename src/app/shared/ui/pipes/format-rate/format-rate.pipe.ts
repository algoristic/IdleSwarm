import { inject, Pipe, PipeTransform } from '@angular/core';

import { formatRate, Notation } from '../../../util/format/format';
import type { NumLike } from '../../../util/num/num';
import { NotationMemo } from '../number-notation/notation-memo';
import { NUMBER_NOTATION } from '../number-notation/number-notation.token';

/**
 * Rate mit einer Nachkommastelle, ab 1 Mio. in der eingestellten Notation.
 * Unrein, damit ein Wechsel des Zahlenformats sofort sichtbar wird ({@link NotationMemo});
 * `notation` erzwingt eine Notation.
 */
@Pipe({ name: 'formatRate', pure: false })
export class FormatRatePipe implements PipeTransform {
  readonly #notation = inject(NUMBER_NOTATION);
  readonly #memo = new NotationMemo<NumLike>(formatRate);

  transform(value: NumLike, notation?: Notation): string {
    return this.#memo.format(value, notation ?? this.#notation());
  }
}
