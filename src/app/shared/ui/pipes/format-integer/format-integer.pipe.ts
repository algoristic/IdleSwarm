import { Pipe, PipeTransform } from '@angular/core';

import { formatInteger } from '../../../util/format';

@Pipe({ name: 'formatInteger' })
export class FormatIntegerPipe implements PipeTransform {
  transform(value: number): string {
    return formatInteger(value);
  }
}
