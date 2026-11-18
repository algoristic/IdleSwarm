import type { Num } from '@app/shared/util/num/num';

import type { SiteTypeId } from '../data/sites-era1.data';

/** Aktuelle Futterstelle; `stock` liegt immer zwischen 0 und `size`. */
export interface Site {
  readonly type: SiteTypeId;
  readonly size: Num;
  readonly stock: Num;
}
