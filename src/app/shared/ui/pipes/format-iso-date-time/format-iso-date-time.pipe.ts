import { Pipe, PipeTransform } from '@angular/core';

import { formatIsoDateTime } from '../../../util/format/date-format';

/** Unix-Zeit für das Attribut `datetime` von `<time>`. */
@Pipe({ name: 'formatIsoDateTime' })
export class FormatIsoDateTimePipe implements PipeTransform {
  transform(ms: number): string {
    return formatIsoDateTime(ms);
  }
}
