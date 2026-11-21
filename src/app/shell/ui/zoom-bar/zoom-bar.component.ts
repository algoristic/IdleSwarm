import { Component, computed, input, output } from '@angular/core';

import { FormatDownPipe } from '@app/shared/ui/pipes/format-down/format-down.pipe';
import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';
import type { Num } from '@app/shared/util/num/num';

import { SHELL_MODES, ShellMode } from '../../domain/models/shell-mode.model';
import { SHELL_MODE_SHORTCUTS } from '../../domain/shell-input-logic';

/**
 * Zoom-Leiste links (US-08.01, Mockup `.zoom`): die freigeschalteten Modi (US-09.04) aus Umgebung,
 * Schwarm und Genom in Zoom-Reihenfolge, der aktive Modus über `aria-current`. Am Genom stehen DNA und als Badge die Zahl bezahlbarer
 * Adaptionen. Darunter die Hinweiszeile zu Mausrad und Tasten (Mockup `.zoom .hint`), nur mit
 * Maus und erst ab zwei Modi; die Knöpfe nennen ihr Tastenkürzel über `aria-keyshortcuts`.
 */
const KEY_HINT_ORDER: readonly ShellMode[] = ['map', 'gen', 'scene'];

@Component({
  selector: 'app-zoom-bar',
  imports: [FormatDownPipe, FormatNumPipe],
  templateUrl: './zoom-bar.component.html',
  styleUrl: './zoom-bar.component.css',
  host: { class: 'block' },
})
export class ZoomBarComponent {
  mode = input.required<ShellMode>();
  /** Erreichbare Modi in Zoom-Reihenfolge (Standard: alle). */
  modes = input<readonly ShellMode[]>(SHELL_MODES);
  dna = input.required<Num>();
  availableAdaptations = input.required<number>();

  shortcuts = SHELL_MODE_SHORTCUTS;

  selectedMode = output<ShellMode>();

  /** Tasten der Hinweiszeile in Mockup-Reihenfolge (W, G, Esc), nur für erreichbare Modi. */
  keyHints = computed(() => KEY_HINT_ORDER.filter((entry) => this.modes().includes(entry)));

  title = $localize`:@@uiShell-zoomBar-title:Zoomstufen`;
  labels: Readonly<Record<ShellMode, string>> = {
    map: $localize`:@@uiShell-zoomBar-map:Umgebung`,
    scene: $localize`:@@uiShell-zoomBar-scene:Schwarm`,
    gen: $localize`:@@uiShell-zoomBar-gen:Genom`,
  };
  keyLabels: Readonly<Record<Exclude<ShellMode, 'scene'>, string>> = {
    map: $localize`:@@uiShell-zoomBar-hintKeyMap:Umgebung`,
    gen: $localize`:@@uiShell-zoomBar-hintKeyGen:Genom`,
  };
  hints: Readonly<Record<Exclude<ShellMode, 'gen'>, string>> = {
    map: $localize`:@@uiShell-zoomBar-mapHint:weiterziehen`,
    scene: $localize`:@@uiShell-zoomBar-sceneHint:Futterstelle`,
  };

  onSelect(mode: ShellMode): void {
    this.selectedMode.emit(mode);
  }
}
