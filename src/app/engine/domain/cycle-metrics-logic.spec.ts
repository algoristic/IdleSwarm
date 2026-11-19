import {
  longestSpanMs,
  noCombatCaptureSpans,
  siteStaySpans,
  spansLongerThan,
  stallSpans,
} from './cycle-metrics-logic';
import type { SiteMetric } from './runner-logic';

const END_MS = 1000;

function site(startMs: number, departureMs: number | null, fought: boolean): SiteMetric {
  return {
    index: 0,
    siteType: fought ? 'vent' : 'algal-mat',
    startMs,
    travelMs: 0,
    emptyMs: null,
    departureMs,
    durationMs: departureMs === null ? null : departureMs - startMs,
    size: 1,
    collected: 1,
    defense: fought ? 1 : 0,
    fought,
    dna: fought ? 1 : 0,
    soldiersBeforeDeparture: null,
    soldiersCarried: null,
    soldiersAtArrival: 0,
    losses: 0,
    soldiersAfterCapture: 0,
  };
}

// Start (kein Kampf) 0–100, Kampfziel 150–400, Algenmatte 450–900, Kampfziel ab 950 offen.
const SITES = [
  site(0, 100, false),
  site(150, 400, true),
  site(450, 900, false),
  site(950, null, true),
];

describe('noCombatCaptureSpans', () => {
  it('teilt an Einnahmen mit Kampf, Algenmatten zählen nicht, die letzte Strecke bleibt offen', () => {
    expect(noCombatCaptureSpans(SITES, END_MS)).toEqual([
      { fromMs: 0, toMs: 150, open: false },
      { fromMs: 150, toMs: 950, open: false },
      { fromMs: 950, toMs: END_MS, open: true },
    ]);
  });

  it('ist ohne Kampfziel eine Strecke über den ganzen Lauf', () => {
    expect(noCombatCaptureSpans([site(0, null, false)], END_MS)).toEqual([
      { fromMs: 0, toMs: END_MS, open: true },
    ]);
  });
});

describe('siteStaySpans', () => {
  it('misst Ankunft bis Aufbruch und lässt die Reise aus', () => {
    expect(siteStaySpans(SITES, END_MS)).toEqual([
      { fromMs: 0, toMs: 100, open: false },
      { fromMs: 150, toMs: 400, open: false },
      { fromMs: 450, toMs: 900, open: false },
      { fromMs: 950, toMs: END_MS, open: true },
    ]);
  });
});

describe('Schwelle', () => {
  it('nimmt nur Strecken strikt über der Schwelle', () => {
    const spans = siteStaySpans(SITES, END_MS);
    expect(spansLongerThan(spans, 250)).toEqual([{ fromMs: 450, toMs: 900, open: false }]);
    expect(longestSpanMs(spans)).toBe(450);
    expect(longestSpanMs([])).toBe(0);
  });

  it('wertet beide Stillstandsarten mit derselben Schwelle aus', () => {
    expect(stallSpans(SITES, END_MS, 400)).toEqual({
      noCombatCapture: [{ fromMs: 150, toMs: 950, open: false }],
      noDeparture: [{ fromMs: 450, toMs: 900, open: false }],
    });
  });

  it('zählt eine offene Strecke am Laufende mit', () => {
    expect(stallSpans(SITES, 2000, 900).noDeparture).toEqual([
      { fromMs: 950, toMs: 2000, open: true },
    ]);
  });
});
