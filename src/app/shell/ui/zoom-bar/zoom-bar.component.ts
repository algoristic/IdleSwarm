import { Component, input, output } from '@angular/core';

import { FormatDownPipe } from '@app/shared/ui/pipes/format-down/format-down.pipe';
import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';
import type { Num } from '@app/shared/util/num/num';

import { SHELL_MODES, ShellMode } from '../../domain/models/shell-mode.model';
import { SHELL_MODE_SHORTCUTS } from '../../domain/shell-input-logic';

/**
 * Zoom-Leiste links (US-08.01, Mockup `.zoom`): Umgebung, Schwarm und Genom in Zoom-Reihenfolge,
 * der aktive Modus über `aria-current`. Am Genom stehen DNA und als Badge die Zahl bezahlbarer
 * Adaptionen. Darunter die Hinweiszeile zu Mausrad und Tasten (Mockup `.zoom .hint`), nur mit
 * Maus; die Knöpfe nennen ihr Tastenkürzel über `aria-keyshortcuts`.
 */
@Component({
  selector: 'app-zoom-bar',
  imports: [FormatDownPipe, FormatNumPipe],
  templateUrl: './zoom-bar.component.html',
  styleUrl: './zoom-bar.component.css',
  host: { class: 'block' },
})
export class ZoomBarComponent {
  mode = input.required<ShellMode>();
  dna = input.required<Num>();
  availableAdaptations = input.required<number>();

  modes = SHELL_MODES;
  shortcuts = SHELL_MODE_SHORTCUTS;

  selectedMode = output<ShellMode>();

  title = $localize`:@@uiShell-zoomBar-title:Zoomstufen`;
  labels: Readonly<Record<ShellMode, string>> = {
    map: $localize`:@@uiShell-zoomBar-map:Umgebung`,
    scene: $localize`:@@uiShell-zoomBar-scene:Schwarm`,
    gen: $localize`:@@uiShell-zoomBar-gen:Genom`,
  };
  hints: Readonly<Record<Exclude<ShellMode, 'gen'>, string>> = {
    map: $localize`:@@uiShell-zoomBar-mapHint:weiterziehen`,
    scene: $localize`:@@uiShell-zoomBar-sceneHint:Futterstelle`,
  };

  onSelect(mode: ShellMode): void {
    this.selectedMode.emit(mode);
  }
}
