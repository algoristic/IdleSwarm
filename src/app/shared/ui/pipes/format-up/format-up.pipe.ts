import { Pipe, PipeTransform } from '@angular/core';

import { formatUp } from '../../../util/format/display-format';
import type { Num } from '../../../util/num/num';

/** Preise und Restmengen: aufgerundet auf die Anzeigegenauigkeit. */
@Pipe({ name: 'formatUp' })
export class FormatUpPipe implements PipeTransform {
  transform(value: Num): string {
    return formatUp(value);
  }
}
