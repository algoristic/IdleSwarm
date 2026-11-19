import { Component, computed, input } from '@angular/core';

import { FormatElapsedPipe } from '@app/shared/ui/pipes/format-elapsed/format-elapsed.pipe';

import { eventLogText } from './event-log-texts';
import type { LogEntryView, LogItem, LogItemKind } from './event-log.component.model';

/** Sichtbare Einträge (Mockup `.log`); ältere fallen heraus. */
const LOG_VISIBLE_ENTRIES = 4;

/** Text-Klassen je Art (Mockup `.hl`, `.rd`, `.dn`, `.cy`). */
const TEXT_CLASSES: Readonly<Record<LogItemKind, string>> = {
  default: 'text-fg',
  found: 'font-extrabold text-primary',
  loss: 'font-extrabold text-magenta',
  dna: 'font-extrabold text-violet',
  travel: 'font-extrabold text-accent',
};

/**
 * Ereignis-Log über der Szene (US-08.04): die letzten vier Ereignisse, das neueste unten, ältere
 * blasser; Farben je Art.
 */
@Component({
  selector: 'app-event-log',
  imports: [FormatElapsedPipe],
  templateUrl: './event-log.component.html',
  styleUrl: './event-log.component.css',
  host: { class: 'block' },
})
export class EventLogComponent {
  /** Neueste zuerst. */
  entries = input.required<readonly LogEntryView[]>();

  /** Älteste der sichtbaren zuerst, damit neue Einträge unten hinzukommen. */
  items = computed<readonly LogItem[]>(() =>
    this.entries()
      .slice(0, LOG_VISIBLE_ENTRIES)
      .reverse()
      .map(({ id, event, kind }) => ({
        id,
        playedMs: event.playedMs,
        text: eventLogText(event),
        kind,
        textClass: TEXT_CLASSES[kind],
      })),
  );
}
