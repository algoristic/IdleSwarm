import type { GameEvent } from '@app/engine/domain/models/game-event.model';
import { formatDown, formatUp, roundUpForDisplay } from '@app/shared/util/format/display-format';
import { formatRate } from '@app/shared/util/format/format';
import { Num } from '@app/shared/util/num/num';
import type { ArrivedEvent, DepartedEvent } from '@app/site/domain/models/site-event.model';
import { SITE_TYPE_LABELS } from '@app/site/ui/site-type-labels/site-type-labels';

const SEPARATOR = ' · ';

/**
 * Text eines Log-Eintrags (US-04.05, US-04.09). DNA abgerundet wie die Mengen; Zurückgelassene und
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
  }
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
