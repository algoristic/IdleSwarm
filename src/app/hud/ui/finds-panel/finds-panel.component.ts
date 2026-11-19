import { Component, input } from '@angular/core';

import type { ValueEffectTarget } from '@app/balance/domain/models/effect.model';
import {
  BADGE_LABELS,
  COLLECTION_SET_LABELS,
  FIND_ENTRY_LABELS,
} from '@app/finds/ui/finds-labels/finds-labels';
import { UNIQUE_ADAPTATION_LABELS } from '@app/genome/ui/genome-labels/genome-labels';
import { FormatDurationPipe } from '@app/shared/ui/pipes/format-duration/format-duration.pipe';
import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';

import type { FindsView } from './finds-panel.component.model';

/**
 * Funde (US-06.03, US-06.04): Fortschritt x / y, je Set die Sammelobjekte mit x / 3 und Badge, je
 * einzigartiger Adaption die Fragmente mit x / benötigt und die laufenden Buffs mit Restzeit.
 */
@Component({
  selector: 'app-finds-panel',
  imports: [FormatDurationPipe, FormatNumPipe],
  templateUrl: './finds-panel.component.html',
  host: { class: 'block' },
})
export class FindsPanelComponent {
  finds = input.required<FindsView>();

  entryLabels = FIND_ENTRY_LABELS;
  setLabels = COLLECTION_SET_LABELS;
  badgeLabels = BADGE_LABELS;
  adaptationLabels = UNIQUE_ADAPTATION_LABELS;

  unknownLabel = $localize`:@@uiHud-findsPanel-field-unknown:Noch nicht gefunden`;

  /** Badges wirken in v1 nur auf Modifikatoren; die übrigen Ziele sind der Vollständigkeit halber da. */
  targetLabels: Readonly<Record<ValueEffectTarget, string>> = {
    collectRate: $localize`:@@uiHud-findsPanel-target-collectRate:Sammelrate`,
    broodRate: $localize`:@@uiHud-findsPanel-target-broodRate:Brutrate`,
    findChance: $localize`:@@uiHud-findsPanel-target-findChance:Fundchance`,
    combatLoss: $localize`:@@uiHud-findsPanel-target-combatLoss:Kampfverluste`,
    sacrificeYield: $localize`:@@uiHud-findsPanel-target-sacrificeYield:Opferertrag`,
    range: $localize`:@@uiHud-findsPanel-target-range:Reichweite`,
    attackPerSoldier: $localize`:@@uiHud-findsPanel-target-attackPerSoldier:Angriff je Soldat`,
    spacePerQueen: $localize`:@@uiHud-findsPanel-target-spacePerQueen:Platz je Königin`,
    pheromonePoints: $localize`:@@uiHud-findsPanel-target-pheromonePoints:Pheromonpunkte`,
  };
}
