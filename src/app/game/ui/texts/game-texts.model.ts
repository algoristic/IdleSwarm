import { FindId } from '../../domain/models/find.model';
import { GameConfig } from '../../domain/models/game-config.model';

export interface UnitTexts {
  readonly name: string;
  readonly plural: string;
  readonly dative: string;
  readonly abbreviation: string;
}

export type FindDescription = (config: GameConfig) => string;

export type FindDescriptions = Readonly<Record<FindId, FindDescription>>;
