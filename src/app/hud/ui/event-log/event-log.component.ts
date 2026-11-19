import { Component, computed, input } from '@angular/core';

import { FormatElapsedPipe } from '@app/shared/ui/pipes/format-elapsed/format-elapsed.pipe';

import { eventLogText } from './event-log-texts';
import type { LogEntryView, LogItem } from './event-log.component.model';

/** Ereignis-Log: Aufbruch, Ankunft und leere Futterstelle, neueste zuerst. */
@Component({
  selector: 'app-event-log',
  imports: [FormatElapsedPipe],
  templateUrl: './event-log.component.html',
  host: { class: 'block' },
})
export class EventLogComponent {
  /** Neueste zuerst. */
  entries = input.required<readonly LogEntryView[]>();

  items = computed<readonly LogItem[]>(() =>
    this.entries().map(({ id, event }) => ({
      id,
      playedMs: event.playedMs,
      text: eventLogText(event),
    })),
  );
}
