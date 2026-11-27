import { Pipe, PipeTransform } from '@angular/core';

import { formatTime } from '../../../util/format';

@Pipe({ name: 'formatTime' })
export class FormatTimePipe implements PipeTransform {
  transform(value: number): string {
    return formatTime(value);
  }
}
