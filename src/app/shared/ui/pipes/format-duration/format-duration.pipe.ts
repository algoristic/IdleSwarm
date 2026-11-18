import { Pipe, PipeTransform } from '@angular/core';

import { formatDuration } from '../../../util/format/display-format';
import type { Num } from '../../../util/num/num';

/** Zeitspanne in Sekunden als `45 s`, `12 min 30 s`, `2 h 05 min`. */
@Pipe({ name: 'formatDuration' })
export class FormatDurationPipe implements PipeTransform {
  transform(seconds: Num): string {
    return formatDuration(seconds);
  }
}
