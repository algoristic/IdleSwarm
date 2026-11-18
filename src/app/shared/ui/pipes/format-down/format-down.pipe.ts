import { Pipe, PipeTransform } from '@angular/core';

import { formatDown } from '../../../util/format/display-format';
import type { Num } from '../../../util/num/num';

/** Mengen wie Einheiten und Nahrung: abgerundet auf die Anzeigegenauigkeit. */
@Pipe({ name: 'formatDown' })
export class FormatDownPipe implements PipeTransform {
  transform(value: Num): string {
    return formatDown(value);
  }
}
