export type ScaleName = "Local" | "Regional" | "Continental";

export interface Relationship {
  partnerId: number;
  ownerId: number;
  pairKey: string;
  name: string;
  bond: string;
  strength: string;
  ageTag: string;
}

export interface TieContract {
  requested: number;
  realized: number;
  generationLimit: number;
  shortfall: number;
}

export interface CharacterAxes {
  wealth: number;
  positionX: number;
  positionY: number;
  abstract1: number;
  abstract2: number;
  abstract3: number;
}

export interface Character {
  id: number;
  name: string;
  culture: string;
  wealth: number;
  tiesRequested: number;
  tiesRealized: number;
  tieContract: TieContract;
  axes: CharacterAxes;
  fact: string;
  relationships: Relationship[];
  generationLog: string[];
}
