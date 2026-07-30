export type ScaleName = "Local" | "Regional" | "Continental";

export interface Relationship {
  name: string;
  bond: string;
  strength: string;
  ageTag: string;
}

export interface Character {
  id: number;
  name: string;
  culture: string;
  wealth: number;
  tiesRequested: number;
  tiesRealized: number;
  fact: string;
  relationships: Relationship[];
}
