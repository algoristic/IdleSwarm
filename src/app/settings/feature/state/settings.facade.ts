import { computed, inject, Injectable, signal } from '@angular/core';

import { GameStore } from '@app/engine/data-access/game-store/game-store.service';
import { PersistenceService } from '@app/persistence/data-access/persistence/persistence.service';
import type { SaveErrorCode } from '@app/persistence/domain/serialize-logic';
import { CLIPBOARD } from '@app/shared/data-access/platform/platform.tokens';
import type { Notation } from '@app/shared/util/format/format';

import type { SettingsPatch } from '../../domain/settings-logic';
import type {
  CopyStatus,
  SettingsDialogView,
  SettingsNotice,
  SettingsPanel,
} from '../../ui/dialog-settings/dialog-settings.component.model';
import { BUILD_INFO } from './settings.tokens';
import { toSettingsView } from './settings.utils';

/**
 * Einstellungen und Spielstand-Verwaltung (US-09.01, US-07.04, US-07.05). Einstellungen ändern sich
 * nur über das Kommando `updateSettings`; Export, Import und Zurücksetzen übernimmt der
 * `PersistenceService`. Der Dialogzustand ist lokaler UI-Zustand.
 */
@Injectable()
export class SettingsFacade {
  readonly #store = inject(GameStore);
  readonly #persistence = inject(PersistenceService);
  readonly #clipboard = inject(CLIPBOARD);
  readonly #build = inject(BUILD_INFO);

  readonly #open = signal(false);
  readonly #panel = signal<SettingsPanel>('main');
  readonly #exportText = signal<string | null>(null);
  readonly #copyStatus = signal<CopyStatus | null>(null);
  readonly #importText = signal('');
  readonly #importError = signal<SaveErrorCode | null>(null);
  readonly #notice = signal<SettingsNotice | null>(null);

  /** Neue Referenz nur bei einer Änderung, nicht mit jedem Tick. */
  settings = computed(() => this.#store.state().settings);
  /** Notation der Zahlen-Pipes (`NUMBER_NOTATION`); die IDs stimmen mit `Notation` überein. */
  numberNotation = computed<Notation>(() => this.settings().numberFormat);
  view = computed(() => toSettingsView(this.settings(), this.#build));
  open = this.#open.asReadonly();
  dialog = computed<SettingsDialogView>(() => ({
    panel: this.#panel(),
    exportText: this.#exportText(),
    copyStatus: this.#copyStatus(),
    importText: this.#importText(),
    importError: this.#importError(),
    notice: this.#notice(),
  }));

  openDialog(): void {
    this.#showPanel('main');
    this.#importText.set('');
    this.#importError.set(null);
    this.#open.set(true);
  }

  closeDialog(): void {
    this.#open.set(false);
    this.#exportText.set(null);
  }

  showPanel(panel: SettingsPanel): void {
    this.#showPanel(panel);
  }

  update(patch: SettingsPatch): void {
    this.#store.dispatch({ type: 'updateSettings', settings: patch });
  }

  resetHints(): void {
    this.#store.dispatch({ type: 'resetHints' });
    this.#notice.set('hints-reset');
  }

  /** Kopiert den Export-Text; ohne Zwischenablage bleibt der Text zum Markieren stehen. */
  async copyExport(): Promise<void> {
    const text = this.#exportText();
    if (text === null) {
      return;
    }
    try {
      await this.#clipboard.writeText(text);
      this.#copyStatus.set('copied');
    } catch {
      this.#copyStatus.set('failed');
    }
  }

  /** Merkt sich den eingefügten Text und fragt nach, bevor er den Spielstand überschreibt. */
  requestImport(text: string): void {
    this.#importText.set(text);
    this.#importError.set(null);
    this.#panel.set('import-confirm');
  }

  confirmImport(): void {
    const outcome = this.#persistence.importSave(this.#importText());
    if (outcome === 'imported') {
      this.#importText.set('');
      this.#showPanel('main');
      this.#notice.set('imported');
      return;
    }
    this.#importError.set(outcome);
    this.#panel.set('import');
  }

  /** Zweite Bestätigung des Zurücksetzens: neues Spiel, Dialog zu. */
  confirmReset(): void {
    this.#persistence.resetGame();
    this.closeDialog();
  }

  #showPanel(panel: SettingsPanel): void {
    this.#notice.set(null);
    this.#copyStatus.set(null);
    if (panel !== 'import') {
      this.#importError.set(null);
    }
    if (panel === 'export') {
      const result = this.#persistence.exportSave();
      this.#exportText.set(result.ok ? result.text : null);
    }
    this.#panel.set(panel);
  }
}
