export type ScaleName = "Local" | "Regional" | "Continental";

export interface Relationship {
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
  culture: number;
  givenName: number;
  familyName: number;
  wealth: number;
  ties: number;
  fact: number;
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
