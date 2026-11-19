/** Reiter mit Zeitreihen aus den Abtastpunkten. */
export type SampleTab = 'resources' | 'rates' | 'decisions' | 'dna';
/** Reiter je Futterstelle (US-10.06). */
export type SiteTab = 'siteDuration' | 'soldiers';
export type ChartTab = SampleTab | SiteTab;
