import { inject, Pipe, PipeTransform } from '@angular/core';

import { formatNum, Notation } from '../../../util/format/format';
import type { NumLike } from '../../../util/num/num';
import { NotationMemo } from '../number-notation/notation-memo';
import { NUMBER_NOTATION } from '../number-notation/number-notation.token';

/**
 * Menge in deutscher Schreibweise, ab 1 Mio. in der eingestellten Notation.
 * Unrein, damit ein Wechsel des Zahlenformats sofort sichtbar wird ({@link NotationMemo});
 * `notation` erzwingt eine Notation.
 */
@Pipe({ name: 'formatNum', pure: false })
export class FormatNumPipe implements PipeTransform {
  readonly #notation = inject(NUMBER_NOTATION);
  readonly #memo = new NotationMemo<NumLike>(formatNum);

  transform(value: NumLike, notation?: Notation): string {
    return this.#memo.format(value, notation ?? this.#notation());
  }
}
