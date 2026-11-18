import { Pipe, PipeTransform } from '@angular/core';

import { formatNum } from '../../../util/format/format';
import type { NumLike } from '../../../util/num/num';

/** Menge in deutscher Schreibweise, ab 1 Mio. gekürzt. */
@Pipe({ name: 'formatNum' })
export class FormatNumPipe implements PipeTransform {
  transform(value: NumLike): string {
    return formatNum(value);
  }
}
