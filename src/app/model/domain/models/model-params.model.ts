import type { ParamKey } from '../params-logic';
import type { BotKind } from './sim.model';

/** Eingaben des Parameter-Panels, so wie die Controls sie bearbeiten (Texte mit deutschem Komma). */
export interface ModelParamsValue {
  readonly seed: string;
  /** Dauer in Millisekunden als Text; ein `<select>` liefert Texte. */
  readonly durationMs: string;
  readonly bots: Readonly<Record<BotKind, boolean>>;
  readonly params: Readonly<Record<ParamKey, string>>;
}
