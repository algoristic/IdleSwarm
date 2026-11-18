import { computed, signal } from '@angular/core';

import { DEFAULT_BALANCE } from '../core/balance/constants';
import { changedParams, ParamDrafts, paramFields, ParamKey, paramsToJson } from './params';
import { BOT_KINDS, BotKind, SimConfig } from './sim/sim-protocol';

const HOUR_MS = 3_600_000;

export const DURATIONS = [
  { label: '1 h', ms: HOUR_MS },
  { label: '6 h', ms: 6 * HOUR_MS },
  { label: '24 h', ms: 24 * HOUR_MS },
  { label: '7 d', ms: 7 * 24 * HOUR_MS },
] as const;

const DEFAULT_DURATION_MS = 24 * HOUR_MS;
const DEFAULT_SEED = 'modell';

/** Eingaben des Parameter-Panels; `config` ist `null`, solange etwas ungültig ist. */
export class ModelForm {
  readonly seed = signal(DEFAULT_SEED);
  readonly durationMs = signal<number>(DEFAULT_DURATION_MS);
  readonly bots = signal<ReadonlySet<BotKind>>(new Set(BOT_KINDS));
  private readonly drafts = signal<ParamDrafts>({});

  readonly fields = computed(() => paramFields(DEFAULT_BALANCE, this.drafts()));
  readonly overrides = computed(() => changedParams(this.fields()));
  readonly exportJson = computed(() => paramsToJson(this.overrides()));
  readonly hasChanges = computed(() => Object.keys(this.overrides()).length > 0);

  /** Gleichwertige Eingaben (`10` und `10,0`) lösen keinen neuen Lauf aus. */
  readonly config = computed<SimConfig | null>(
    () => {
      const seed = this.seed().trim();
      const kinds = BOT_KINDS.filter((kind) => this.bots().has(kind));
      if (seed === '' || kinds.length === 0 || this.fields().some((f) => f.value === null)) {
        return null;
      }
      return {
        seed,
        durationMs: this.durationMs(),
        bots: kinds.map((kind) => ({ kind })),
        params: this.overrides(),
      };
    },
    { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
  );

  setDraft(key: ParamKey, text: string): void {
    this.drafts.update((drafts) => ({ ...drafts, [key]: text }));
  }

  resetDraft(key: ParamKey): void {
    this.drafts.update((drafts) => {
      const next = { ...drafts };
      delete next[key];
      return next;
    });
  }

  setBot(kind: BotKind, selected: boolean): void {
    this.bots.update((bots) => {
      const next = new Set(bots);
      if (selected) {
        next.add(kind);
      } else {
        next.delete(kind);
      }
      return next;
    });
  }
}
