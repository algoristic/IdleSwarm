import { Pipe, PipeTransform } from '@angular/core';

import { formatDuration } from '../../../util/format';

@Pipe({ name: 'formatDuration' })
export class FormatDurationPipe implements PipeTransform {
  transform(value: number): string {
    return formatDuration(value);
  }
}
