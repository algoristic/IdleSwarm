import type { GameEvent } from '@app/engine/domain/models/game-event.model';
import type { FoundEvent } from '@app/finds/domain/models/finds-event.model';
import { BADGE_LABELS, FIND_ENTRY_LABELS } from '@app/finds/ui/finds-labels/finds-labels';
import {
  GENOME_NODE_LABELS,
  UNIQUE_ADAPTATION_LABELS,
} from '@app/genome/ui/genome-labels/genome-labels';
import { formatDown, formatUp, roundUpForDisplay } from '@app/shared/util/format/display-format';
import { formatElapsed, formatShare } from '@app/shared/util/format/elapsed-format';
import { formatNum, formatRate } from '@app/shared/util/format/format';
import { Num } from '@app/shared/util/num/num';
import type { ArrivedEvent, DepartedEvent } from '@app/site/domain/models/site-event.model';
import { SITE_TYPE_LABELS } from '@app/site/ui/site-type-labels/site-type-labels';

const SEPARATOR = ' · ';

/**
 * Text eines Log-Eintrags (US-04.05, US-04.09, US-05.03, US-06.01). DNA abgerundet wie die Mengen; Zurückgelassene und
 * Verluste aufgerundet wie die Vorschau der Umgebung, damit ein Bruchteil nicht verschwindet.
 */
export function eventLogText(event: GameEvent): string {
  switch (event.type) {
    case 'departed':
      return departedText(event);
    case 'arrived':
      return arrivedText(event);
    case 'siteDepleted': {
      const site = SITE_TYPE_LABELS[event.siteType];
      return $localize`:@@uiHud-eventLog-siteDepleted:Futterstelle leer: ${site}:site:`;
    }
    case 'evolved': {
      const node = GENOME_NODE_LABELS[event.node];
      const cost = formatDown(event.cost);
      return [
        $localize`:@@uiHud-eventLog-evolved:Adaption entwickelt: ${node}:node:`,
        $localize`:@@uiHud-eventLog-evolved-cost:−${cost}:cost: DNA`,
      ].join(SEPARATOR);
    }
    case 'found':
      return foundText(event);
  }
}

/**
 * Fund (Game-Design §4.16): Eintrag, bei einem Ersatz der ursprüngliche Eintrag, dann Wirkung,
 * Futterstelle und Auslöser. DNA und Nahrung abgerundet wie die Mengen, der Buff-Ablauf als
 * Spielzeit wie die Zeiten des Logs.
 */
function foundText(event: FoundEvent): string {
  const entry = FIND_ENTRY_LABELS[event.entry];
  const parts = [
    event.replaced === null
      ? $localize`:@@uiHud-eventLog-found:Fund: ${entry}:entry:`
      : $localize`:@@uiHud-eventLog-found-replaced:Fund: ${entry}:entry: statt ${FIND_ENTRY_LABELS[event.replaced]}:replaced:`,
  ];
  if (event.amount !== null) {
    const amount = formatDown(event.amount);
    parts.push(
      event.kind === 'dna'
        ? $localize`:@@uiHud-eventLog-found-dna:+${amount}:amount: DNA`
        : $localize`:@@uiHud-eventLog-found-food:+${amount}:amount: Nahrung`,
    );
  }
  if (event.buffExpiresAtMs !== null) {
    const until = formatElapsed(event.buffExpiresAtMs);
    parts.push($localize`:@@uiHud-eventLog-found-buff:wirkt bis ${until}:until:`);
  }
  if (event.fragment !== null) {
    const found = formatNum(event.fragment.found);
    const required = formatNum(event.fragment.required);
    parts.push($localize`:@@uiHud-eventLog-found-fragment:${found}:found: / ${required}:required:`);
  }
  if (event.unlocked !== null) {
    const adaptation = UNIQUE_ADAPTATION_LABELS[event.unlocked];
    parts.push(
      $localize`:@@uiHud-eventLog-found-unlocked:${adaptation}:adaptation: freigeschaltet`,
    );
  }
  if (event.badge !== null) {
    const badge = BADGE_LABELS[event.badge];
    parts.push($localize`:@@uiHud-eventLog-found-badge:Badge ${badge}:badge: erhalten`);
  }
  const site = SITE_TYPE_LABELS[event.siteType];
  parts.push(
    event.harvestShare === null
      ? $localize`:@@uiHud-eventLog-found-arrival:${site}:site:, Einnahme`
      : $localize`:@@uiHud-eventLog-found-harvestShare:${site}:site:, ${formatShare(event.harvestShare)}:share: abgebaut`,
  );
  return parts.join(SEPARATOR);
}

function departedText(event: DepartedEvent): string {
  const site = SITE_TYPE_LABELS[event.siteType];
  const distance = formatRate(event.distance);
  const parts = [
    $localize`:@@uiHud-eventLog-departed:Aufbruch zu ${site}:site: (Distanz ${distance}:distance:)`,
  ];
  const drones = roundUpForDisplay(event.leftBehind.drones);
  if (drones.gt(Num.ZERO)) {
    const count = formatUp(drones);
    parts.push(
      drones.eq(Num.ONE)
        ? $localize`:@@uiHud-eventLog-departed-leftDrone:${count}:count: Drohne zurückgelassen`
        : $localize`:@@uiHud-eventLog-departed-leftDrones:${count}:count: Drohnen zurückgelassen`,
    );
  }
  const soldiers = roundUpForDisplay(event.leftBehind.soldiers);
  if (soldiers.gt(Num.ZERO)) {
    const count = formatUp(soldiers);
    parts.push(
      soldiers.eq(Num.ONE)
        ? $localize`:@@uiHud-eventLog-departed-leftSoldier:${count}:count: Soldat zurückgelassen`
        : $localize`:@@uiHud-eventLog-departed-leftSoldiers:${count}:count: Soldaten zurückgelassen`,
    );
  }
  if (event.forfeitedStock.gt(Num.ZERO)) {
    // Aufgerundet wie der Vorrat der Futterstelle, damit ein Rest nicht als 0 erscheint.
    const stock = formatUp(event.forfeitedStock);
    parts.push(
      $localize`:@@uiHud-eventLog-departed-forfeitedStock:Restvorrat ${stock}:stock: verfallen`,
    );
  }
  if (event.auto) {
    parts.push($localize`:@@uiHud-eventLog-departed-auto:automatisch`);
  }
  return parts.join(SEPARATOR);
}

function arrivedText(event: ArrivedEvent): string {
  const site = SITE_TYPE_LABELS[event.siteType];
  const parts = [$localize`:@@uiHud-eventLog-arrived:Ankunft: ${site}:site: eingenommen`];
  const losses = roundUpForDisplay(event.losses);
  if (losses.isZero()) {
    parts.push($localize`:@@uiHud-eventLog-arrived-noLosses:ohne Verluste`);
  } else {
    // Aufgerundet: Ein Bruchteil eines Soldaten erscheint als „−1“, nie als „−0“.
    const count = formatUp(losses);
    parts.push(
      losses.eq(Num.ONE)
        ? $localize`:@@uiHud-eventLog-arrived-loss:−${count}:count: Soldat`
        : $localize`:@@uiHud-eventLog-arrived-losses:−${count}:count: Soldaten`,
    );
  }
  const dna = formatDown(event.dna);
  parts.push($localize`:@@uiHud-eventLog-arrived-dna:+${dna}:dna: DNA`);
  return parts.join(SEPARATOR);
}
