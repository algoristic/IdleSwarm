import { inject, Pipe, PipeTransform } from '@angular/core';

import { formatUp } from '../../../util/format/display-format';
import type { Notation } from '../../../util/format/format';
import type { Num } from '../../../util/num/num';
import { NotationMemo } from '../number-notation/notation-memo';
import { NUMBER_NOTATION } from '../number-notation/number-notation.token';

/**
 * Preise und Restmengen: aufgerundet auf die Anzeigegenauigkeit.
 * Unrein, damit ein Wechsel des Zahlenformats sofort sichtbar wird ({@link NotationMemo});
 * `notation` erzwingt eine Notation.
 */
@Pipe({ name: 'formatUp', pure: false })
export class FormatUpPipe implements PipeTransform {
  readonly #notation = inject(NUMBER_NOTATION);
  readonly #memo = new NotationMemo<Num>(formatUp);

  transform(value: Num, notation?: Notation): string {
    return this.#memo.format(value, notation ?? this.#notation());
  }
}
