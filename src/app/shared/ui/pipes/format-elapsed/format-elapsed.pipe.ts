import { Pipe, PipeTransform } from '@angular/core';

import { formatElapsed } from '../../../util/format/elapsed-format';

/** Zeitspanne in Millisekunden als `45 s`, `3 min 20 s`, `2 h 05 min`. */
@Pipe({ name: 'formatElapsed' })
export class FormatElapsedPipe implements PipeTransform {
  transform(ms: number): string {
    return formatElapsed(ms);
  }
}
