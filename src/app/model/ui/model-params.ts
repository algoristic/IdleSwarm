import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';

import { DURATIONS, ModelForm } from '../model-form';
import { BOT_LABELS, MODEL_TEXTS, PARAM_HINTS } from '../model-texts.de';
import type { ParamKey } from '../params';
import { BOT_KINDS, BotKind } from '../sim/sim-protocol';

const EXPORT_FILE = 'balance-overrides.json';

/** Parameter-Panel: Seed, Dauer, Bots, alle Konstanten, Basislauf und JSON-Export. */
@Component({
  selector: 'app-model-params',
  templateUrl: './model-params.html',
  styleUrl: './model-params.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelParams {
  private readonly document = inject(DOCUMENT);

  readonly form = input.required<ModelForm>();
  readonly canPin = input(false);
  readonly hasBaseline = input(false);
  readonly run = output();
  readonly pinBaseline = output();
  readonly clearBaseline = output();

  protected readonly texts = MODEL_TEXTS;
  protected readonly hints = PARAM_HINTS;
  protected readonly durations = DURATIONS;
  protected readonly botKinds = BOT_KINDS;
  protected readonly botLabels = BOT_LABELS;
  protected readonly copyStatus = signal('');

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected setDuration(event: Event): void {
    this.form().durationMs.set(Number(this.value(event)));
  }

  protected setBot(kind: BotKind, event: Event): void {
    this.form().setBot(kind, (event.target as HTMLInputElement).checked);
  }

  protected setParam(key: ParamKey, event: Event): void {
    this.form().setDraft(key, this.value(event));
  }

  protected async copy(): Promise<void> {
    try {
      await this.document.defaultView?.navigator.clipboard.writeText(this.form().exportJson());
      this.copyStatus.set(MODEL_TEXTS.copied);
    } catch {
      this.copyStatus.set(MODEL_TEXTS.copyFailed);
    }
  }

  protected download(): void {
    const blob = new Blob([this.form().exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = EXPORT_FILE;
    link.click();
    URL.revokeObjectURL(url);
  }
}
