import { Component, input, model } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';

import { SegmentComponent } from '@app/shared/ui/segment/segment.component';
import { SegmentOption } from '@app/shared/ui/segment/segment.model';

@Component({
  selector: 'app-form-choice',
  imports: [SegmentComponent],
  templateUrl: './form-choice.component.html',
  host: { class: 'block min-w-0' },
})
export class FormChoiceComponent implements FormValueControl<string> {
  options = input.required<readonly SegmentOption[]>();
  label = input.required<string>();

  value = model('');

  onSelect(id: string): void {
    this.value.set(id);
  }
}
