import { BuffId } from '../../domain/models/find.model';

export type ChipView =
  | { id: string; kind: 'zone'; zone: number; open: boolean; threshold: number }
  | { id: string; kind: 'buff'; buff: BuffId; remaining: number }
  | { id: string; kind: 'freeUpgrades'; count: number }
  | { id: string; kind: 'tempo'; tempo: number };
