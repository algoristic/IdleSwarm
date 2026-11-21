import type { HintId } from '../../domain/models/onboarding.model';

export interface HintTexts {
  readonly title: string;
  readonly text: string;
}

/** Titel und Text je Hinweis (US-09.04, Game-Design §4.18). */
export const HINT_TEXTS: Readonly<Record<HintId, HintTexts>> = {
  collect: {
    title: $localize`:@@uiOnboarding-hintLabels-collect-title:Drohnen sammeln`,
    text: $localize`:@@uiOnboarding-hintLabels-collect-text:Drohnen sammeln Nahrung an der Futterstelle. Königinnen brüten: Aus ihren Eiern schlüpft Nachwuchs für den Schwarm.`,
  },
  pheromones: {
    title: $localize`:@@uiOnboarding-hintLabels-pheromones-title:Pheromone`,
    text: $localize`:@@uiOnboarding-hintLabels-pheromones-text:In der Schublade „Pheromone“ verteilst du Punkte auf Drohnen und Soldaten und lenkst so die Brut. Eine stärkere Drüse bringt weitere Punkte.`,
  },
  map: {
    title: $localize`:@@uiOnboarding-hintLabels-map-title:Umgebung`,
    text: $localize`:@@uiOnboarding-hintLabels-map-text:Die Futterstelle wird knapp. In der Umgebung wählst du ein neues Ziel und ziehst weiter; Soldaten helfen gegen dessen Abwehr.`,
  },
  finds: {
    title: $localize`:@@uiOnboarding-hintLabels-finds-title:Funde`,
    text: $localize`:@@uiOnboarding-hintLabels-finds-text:Beim Abbau stößt der Schwarm manchmal auf Funde. Die Schublade „Funde“ zeigt Sammlung, Sets und laufende Wirkungen.`,
  },
  genome: {
    title: $localize`:@@uiOnboarding-hintLabels-genome-title:Genom`,
    text: $localize`:@@uiOnboarding-hintLabels-genome-text:Mit DNA entwickelst du im Genom Adaptionen, die den Schwarm dauerhaft stärken.`,
  },
  'auto-move': {
    title: $localize`:@@uiOnboarding-hintLabels-autoMove-title:Auto-Weiterziehen`,
    text: $localize`:@@uiOnboarding-hintLabels-autoMove-text:Unter „Weiterziehen“ kann der Schwarm von selbst aufbrechen, sobald der Vorrat unter eine Schwelle fällt.`,
  },
};
