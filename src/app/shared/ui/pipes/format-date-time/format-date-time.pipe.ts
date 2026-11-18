import { Pipe, PipeTransform } from '@angular/core';

import { formatDateTime } from '../../../util/format/date-format';

/** Unix-Zeit als deutsches Datum mit Uhrzeit. */
@Pipe({ name: 'formatDateTime' })
export class FormatDateTimePipe implements PipeTransform {
  transform(ms: number): string {
    return formatDateTime(ms);
  }
}
