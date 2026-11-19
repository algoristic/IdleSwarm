import { Component, computed, DOCUMENT, inject, input, model, output, signal } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';

import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { FormatElapsedPipe } from '@app/shared/ui/pipes/format-elapsed/format-elapsed.pipe';

import { defaultModelParams, DURATIONS_MS } from '../../domain/model-params-logic';
import type { ModelParamsValue } from '../../domain/models/model-params.model';
import { BOT_KINDS } from '../../domain/models/sim.model';
import {
  changedParams,
  formatParam,
  paramConflicts,
  ParamKey,
  paramFields,
  paramsToJson,
} from '../../domain/params-logic';
import { BOT_LABELS } from '../bot-labels/bot-labels';
import { modelParamsSchema } from './form-model-params.schema';

const EXPORT_FILE = 'balance-overrides.json';
const PARAM_KEYS = Object.keys(DEFAULT_BALANCE) as ParamKey[];

/** Parameter-Panel: Seed, Dauer, Bots, alle Konstanten, Basislauf und JSON-Export. */
@Component({
  selector: 'app-form-model-params',
  imports: [FormatElapsedPipe, FormField, FormRoot],
  templateUrl: './form-model-params.component.html',
  host: { class: 'block' },
})
export class FormModelParamsComponent {
  readonly #document = inject(DOCUMENT);

  /** Das Modell hält der `feature`-Layer; jede gültige Änderung startet dort einen Lauf. */
  paramsModel = model<ModelParamsValue>(defaultModelParams(DEFAULT_BALANCE));
  canPin = input(false);
  hasBaseline = input(false);

  durations = DURATIONS_MS;
  botKinds = BOT_KINDS;
  botLabels = BOT_LABELS;

  submittedParams = output<ModelParamsValue>();
  clickedPin = output();
  clickedClearBaseline = output();

  paramsForm = form(this.paramsModel, modelParamsSchema(PARAM_KEYS), {
    submission: {
      action: async (field) => {
        this.submittedParams.emit(field().value());
        return undefined;
      },
    },
  });

  fields = computed(() => paramFields(DEFAULT_BALANCE, this.paramsModel().params));
  conflicts = computed(() => paramConflicts(this.paramsModel().params));
  exportJson = computed(() => paramsToJson(changedParams(this.fields())));
  hasChanges = computed(() => this.fields().some((field) => field.changed));
  copyStatus = signal('');

  hints: Partial<Readonly<Record<ParamKey, string>>> = {
    baseFoodRate: $localize`:@@uiModel-formModelParams-hint-baseFoodRate:Grundertrag in Nahrung/s`,
    droneCost: $localize`:@@uiModel-formModelParams-hint-droneCost:Basiskosten Drohne`,
    droneCostGrowth: $localize`:@@uiModel-formModelParams-hint-droneCostGrowth:Preisfaktor Drohne`,
    droneCollectRate: $localize`:@@uiModel-formModelParams-hint-droneCollectRate:Nahrung/s je Drohne`,
    droneSpace: $localize`:@@uiModel-formModelParams-hint-droneSpace:Platzbedarf Drohne`,
    soldierCost: $localize`:@@uiModel-formModelParams-hint-soldierCost:Basiskosten Soldat`,
    soldierCostGrowth: $localize`:@@uiModel-formModelParams-hint-soldierCostGrowth:Preisfaktor Soldat`,
    soldierAttack: $localize`:@@uiModel-formModelParams-hint-soldierAttack:Angriff je Soldat`,
    soldierSpace: $localize`:@@uiModel-formModelParams-hint-soldierSpace:Platzbedarf Soldat`,
    queenCost: $localize`:@@uiModel-formModelParams-hint-queenCost:Basiskosten Königin`,
    queenCostGrowth: $localize`:@@uiModel-formModelParams-hint-queenCostGrowth:Preisfaktor Königin`,
    queenEggsPerMin: $localize`:@@uiModel-formModelParams-hint-queenEggsPerMin:Eier/min je Königin`,
    queenSpace: $localize`:@@uiModel-formModelParams-hint-queenSpace:Platzangebot je Königin`,
    broodDroneShare: $localize`:@@uiModel-formModelParams-hint-broodDroneShare:Drohnenanteil der Brut (0 bis 1)`,
    startFood: $localize`:@@uiModel-formModelParams-hint-startFood:Nahrung beim Start`,
    startQueens: $localize`:@@uiModel-formModelParams-hint-startQueens:Königinnen beim Start`,
    siteSize: $localize`:@@uiModel-formModelParams-hint-siteSize:Größe der Futterstelle`,
    baseRange: $localize`:@@uiModel-formModelParams-hint-baseRange:Grundreichweite in Distanzeinheiten`,
    perceptionMargin: $localize`:@@uiModel-formModelParams-hint-perceptionMargin:Wahrnehmungssaum über die Reichweite hinaus`,
    candidateCount: $localize`:@@uiModel-formModelParams-hint-candidateCount:Kandidaten je Erzeugung (ganze Zahl)`,
    candidateMinDistance: $localize`:@@uiModel-formModelParams-hint-candidateMinDistance:Kleinste Distanz eines Kandidaten`,
    candidateMaxDistance: $localize`:@@uiModel-formModelParams-hint-candidateMaxDistance:Größte Distanz eines Kandidaten`,
    siteSizeGrowth: $localize`:@@uiModel-formModelParams-hint-siteSizeGrowth:Wachstum der Größe je Weiterzug`,
    siteSizeDistanceBonus: $localize`:@@uiModel-formModelParams-hint-siteSizeDistanceBonus:Größenzuschlag je Distanzeinheit über 1`,
    siteDefenseBase: $localize`:@@uiModel-formModelParams-hint-siteDefenseBase:Basis der Abwehr`,
    siteDefenseGrowth: $localize`:@@uiModel-formModelParams-hint-siteDefenseGrowth:Wachstum der Abwehr je Weiterzug`,
    siteDefenseDistanceBonus: $localize`:@@uiModel-formModelParams-hint-siteDefenseDistanceBonus:Abwehrzuschlag je Distanzeinheit über 1`,
    siteSpread: $localize`:@@uiModel-formModelParams-hint-siteSpread:Streuung des Zufallsfaktors um 1`,
    dnaBase: $localize`:@@uiModel-formModelParams-hint-dnaBase:Basis der DNA-Belohnung`,
    dnaExponent: $localize`:@@uiModel-formModelParams-hint-dnaExponent:Exponent der DNA-Belohnung`,
    lossFactor: $localize`:@@uiModel-formModelParams-hint-lossFactor:Verlustfaktor`,
    lossExponent: $localize`:@@uiModel-formModelParams-hint-lossExponent:Verlustexponent`,
    sacrificeYield: $localize`:@@uiModel-formModelParams-hint-sacrificeYield:Ausbeute beim Opfern von Drohnen (0 bis 1)`,
    minSacrificeLoss: $localize`:@@uiModel-formModelParams-hint-minSacrificeLoss:Mindest-Umwandlungsverlust beim Opfern`,
    travelSecondsPerDistance: $localize`:@@uiModel-formModelParams-hint-travelSecondsPerDistance:Reisedauer in s je Distanzeinheit`,
    balancedMaxLossShare: $localize`:@@uiModel-formModelParams-hint-balancedMaxLossShare:Höchster Verlustanteil für „Ausgewogen“`,
    defaultAutoThreshold: $localize`:@@uiModel-formModelParams-hint-defaultAutoThreshold:Standard-Schwelle des Auto-Weiterziehens`,
    maxAutoThreshold: $localize`:@@uiModel-formModelParams-hint-maxAutoThreshold:Höchste einstellbare Schwelle`,
    algalMatSizeFactor: $localize`:@@uiModel-formModelParams-hint-algalMatSizeFactor:Größenfaktor Algenmatte`,
    algalMatDefenseFactor: $localize`:@@uiModel-formModelParams-hint-algalMatDefenseFactor:Abwehrfaktor Algenmatte`,
    algalMatFindChance: $localize`:@@uiModel-formModelParams-hint-algalMatFindChance:Fundchance Algenmatte (0 bis 1)`,
    algalMatWeight: $localize`:@@uiModel-formModelParams-hint-algalMatWeight:Ziehungsgewicht Algenmatte`,
    ventSizeFactor: $localize`:@@uiModel-formModelParams-hint-ventSizeFactor:Größenfaktor Schlot`,
    ventDefenseFactor: $localize`:@@uiModel-formModelParams-hint-ventDefenseFactor:Abwehrfaktor Schlot`,
    ventFindChance: $localize`:@@uiModel-formModelParams-hint-ventFindChance:Fundchance Schlot (0 bis 1)`,
    ventWeight: $localize`:@@uiModel-formModelParams-hint-ventWeight:Ziehungsgewicht Schlot`,
    bacterialMatSizeFactor: $localize`:@@uiModel-formModelParams-hint-bacterialMatSizeFactor:Größenfaktor Bakterienrasen`,
    bacterialMatDefenseFactor: $localize`:@@uiModel-formModelParams-hint-bacterialMatDefenseFactor:Abwehrfaktor Bakterienrasen`,
    bacterialMatFindChance: $localize`:@@uiModel-formModelParams-hint-bacterialMatFindChance:Fundchance Bakterienrasen (0 bis 1)`,
    bacterialMatWeight: $localize`:@@uiModel-formModelParams-hint-bacterialMatWeight:Ziehungsgewicht Bakterienrasen`,
    methaneSeepSizeFactor: $localize`:@@uiModel-formModelParams-hint-methaneSeepSizeFactor:Größenfaktor Methanquelle`,
    methaneSeepDefenseFactor: $localize`:@@uiModel-formModelParams-hint-methaneSeepDefenseFactor:Abwehrfaktor Methanquelle`,
    methaneSeepFindChance: $localize`:@@uiModel-formModelParams-hint-methaneSeepFindChance:Fundchance Methanquelle (0 bis 1)`,
    methaneSeepWeight: $localize`:@@uiModel-formModelParams-hint-methaneSeepWeight:Ziehungsgewicht Methanquelle`,
    whaleFallSizeFactor: $localize`:@@uiModel-formModelParams-hint-whaleFallSizeFactor:Größenfaktor Walsturz`,
    whaleFallDefenseFactor: $localize`:@@uiModel-formModelParams-hint-whaleFallDefenseFactor:Abwehrfaktor Walsturz`,
    whaleFallFindChance: $localize`:@@uiModel-formModelParams-hint-whaleFallFindChance:Fundchance Walsturz (0 bis 1)`,
    whaleFallWeight: $localize`:@@uiModel-formModelParams-hint-whaleFallWeight:Ziehungsgewicht Walsturz`,
  };
  resetLabel = $localize`:@@uiModel-formModelParams-reset:zurücksetzen`;
  readonly #copiedText = $localize`:@@uiModel-formModelParams-copied:Kopiert.`;
  readonly #copyFailedText = $localize`:@@uiModel-formModelParams-copyFailed:Kopieren nicht möglich.`;

  onResetParam(key: ParamKey): void {
    this.paramsForm.params[key]().value.set(formatParam(DEFAULT_BALANCE[key]));
  }

  async onCopy(): Promise<void> {
    try {
      await this.#document.defaultView?.navigator.clipboard.writeText(this.exportJson());
      this.copyStatus.set(this.#copiedText);
    } catch {
      this.copyStatus.set(this.#copyFailedText);
    }
  }

  onDownload(): void {
    const blob = new Blob([this.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = this.#document.createElement('a');
    link.href = url;
    link.download = EXPORT_FILE;
    link.click();
    URL.revokeObjectURL(url);
  }
}
