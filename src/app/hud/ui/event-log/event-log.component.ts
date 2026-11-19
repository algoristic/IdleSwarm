import { Component, computed, input } from '@angular/core';

import { FormatElapsedPipe } from '@app/shared/ui/pipes/format-elapsed/format-elapsed.pipe';

import { eventLogText } from './event-log-texts';
import type { LogEntryView, LogItem, LogItemKind } from './event-log.component.model';

/** Text-Klassen je Art; Funde in Akzentfarbe und fett (US-06.01). */
const TEXT_CLASSES: Readonly<Record<LogItemKind, string>> = {
  default: 'min-w-0',
  found: 'min-w-0 font-semibold text-accent',
};

/** Ereignis-Log: Aufbruch, Ankunft, leere Futterstelle, Adaptionen und Funde, neueste zuerst. */
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
    this.entries().map(({ id, event }) => {
      const kind: LogItemKind = event.type === 'found' ? 'found' : 'default';
      return {
        id,
        playedMs: event.playedMs,
        text: eventLogText(event),
        kind,
        textClass: TEXT_CLASSES[kind],
      };
    }),
  );
}
