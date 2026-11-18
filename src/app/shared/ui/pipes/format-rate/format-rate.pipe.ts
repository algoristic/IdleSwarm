import { Pipe, PipeTransform } from '@angular/core';

import { formatRate } from '../../../util/format/format';
import type { NumLike } from '../../../util/num/num';

/** Rate mit einer Nachkommastelle. */
@Pipe({ name: 'formatRate' })
export class FormatRatePipe implements PipeTransform {
  transform(value: NumLike): string {
    return formatRate(value);
  }
}
