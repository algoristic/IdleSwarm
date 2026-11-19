import type { GameState } from '@app/engine/domain/models/game-state.model';
import type { FragmentProgress, UniqueAdaptationId } from '@app/genome/domain/models/genome.model';
import type { Num } from '@app/shared/util/num/num';
import type { SiteTypeId } from '@app/site/domain/data/sites-era1.data';

import type { CollectionSetId, FindEntryId, FindKind, FindTrigger } from './finds.model';

/**
 * Ein Fund (Game-Design §4.16); Ziehungen ohne Fund erzeugen kein Ereignis. `playedMs` ist die
 * Spielzeit (`time.played`) der Ziehung. Für das Log (hervorgehoben, US-06.01) und den Runner.
 */
export interface FoundEvent {
  readonly type: 'found';
  readonly playedMs: number;
  /** Typ der Futterstelle, für die gezogen wurde (bei der Ankunft die neue). */
  readonly siteType: SiteTypeId;
  readonly trigger: FindTrigger;
  /** Abbau-Schwelle `j` (1 … `n_A`) bei `harvest`, sonst `null`. */
  readonly threshold: number | null;
  /** Wirksamer Eintrag; bei einem Ersatz `foreign-dna`. */
  readonly entry: FindEntryId;
  readonly kind: FindKind;
  /** Gezogener Eintrag, dessen Ziel schon erreicht war und der zu Fremder DNA wurde; sonst `null`. */
  readonly replaced: FindEntryId | null;
  /** Gutgeschriebene DNA bzw. Nahrung; `null` bei Buff, Fragment und Sammelobjekt. */
  readonly amount: Num | null;
  /** Neuer Ablauf des Buffs in Spielzeit; `null` bei anderen Arten. */
  readonly buffExpiresAtMs: number | null;
  /** Fortschritt des Fragments nach dem Fund (x / benötigt); `null` bei anderen Arten. */
  readonly fragment: FragmentProgress | null;
  /** Durch diesen Fund freigeschaltete einzigartige Adaption. */
  readonly unlocked: UniqueAdaptationId | null;
  /** Durch diesen Fund vervollständigtes Set; die Badge-ID ist die Set-ID (§4.17). */
  readonly badge: CollectionSetId | null;
}

export type FindsEvent = FoundEvent;

/** Zustand und Ereignisse einer Ziehung. */
export interface FindsResult {
  readonly state: GameState;
  readonly events: readonly FindsEvent[];
}
