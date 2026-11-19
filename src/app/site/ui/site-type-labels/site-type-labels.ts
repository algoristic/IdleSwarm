import type { SiteTypeId } from '../../domain/data/sites-era1.data';

/** Namen der Futterstellentypen für HUD, Log und Umgebung. */
export const SITE_TYPE_LABELS: Readonly<Record<SiteTypeId, string>> = {
  'algal-mat': $localize`:@@uiSite-siteTypeLabels-algalMat:Algenmatte`,
  vent: $localize`:@@uiSite-siteTypeLabels-vent:Hydrothermaler Schlot`,
  'bacterial-mat': $localize`:@@uiSite-siteTypeLabels-bacterialMat:Bakterienrasen`,
  'methane-seep': $localize`:@@uiSite-siteTypeLabels-methaneSeep:Methanquelle`,
  'whale-fall': $localize`:@@uiSite-siteTypeLabels-whaleFall:Walsturz`,
};
