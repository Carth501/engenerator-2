import type { Character, Relationship, ScaleName } from "./types";

const CULTURES = [
  {
    name: "Verdane",
    first: [
      "Isolde",
      "Brannor",
      "Thessaly",
      "Corwin",
      "Maren",
      "Aldric",
      "Sabine",
      "Roderic",
    ],
    last: ["Ashford", "Vell", "Kirwan", "Marrow"],
  },
  {
    name: "Keshet",
    first: [
      "Yara",
      "Doran",
      "Nima",
      "Kael",
      "Sorrel",
      "Piran",
      "Talis",
      "Odessa",
    ],
    last: ["Ren", "Voss", "Tharin", "Idu"],
  },
  {
    name: "Oyari",
    first: [
      "Femi",
      "Adaeze",
      "Bakari",
      "Nkiru",
      "Tolu",
      "Ekene",
      "Zuri",
      "Chike",
    ],
    last: ["Obasi", "Enyi", "Ade", "Oku"],
  },
  {
    name: "Solmere",
    first: [
      "Liesel",
      "Petro",
      "Vanna",
      "Miklos",
      "Ines",
      "Rurik",
      "Anzhe",
      "Dagny",
    ],
    last: ["Vashti", "Korr", "Lund", "Marek"],
  },
  {
    name: "Tanoa",
    first: [
      "Kailani",
      "Rehua",
      "Manaia",
      "Tavita",
      "Anahera",
      "Puna",
      "Hina",
      "Rongo",
    ],
    last: ["Faleolo", "Iosefa", "Tui", "Vaka"],
  },
];

const FACTS = [
  "Keeps a ledger of every debt owed, real or imagined.",
  "Has not slept indoors during a full moon in years.",
  "Named every stray cat in the district after a different rival.",
  "Believes storms are omens and plans travel around them.",
  "Carries a spare cloak pin that belonged to someone they will not name.",
  "Refuses to eat anything blue.",
  "Writes letters to a person who may not exist.",
  "Collects the first coin from every place they have slept.",
];

const ARCHETYPES = [
  { key: "neighbor", label: "Neighbor" },
  { key: "childhood", label: "Childhood Tie" },
  { key: "acquaintance", label: "Acquaintance" },
  { key: "chance", label: "Chance" },
];

const STRENGTHS = [
  "Warm",
  "Devoted",
  "Strained",
  "Complicated",
  "Rivalrous",
  "Fond",
  "Wary",
];
const BONDS = [
  "Parent",
  "Sibling",
  "Family",
  "Friend",
  "Peer",
  "Rival",
  "Acquaintance",
  "Mentor",
];
const AGE_TAGS = [
  "Recent",
  "A few seasons",
  "Several years",
  "Half a lifetime",
  "Longer than either recalls exactly",
  "Since before either could say",
  "A passing while",
];

const SCALE_COUNTS: Record<ScaleName, number> = {
  Local: 8,
  Regional: 20,
  Continental: 45,
};

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let value = seed;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function choose<T>(values: T[], random: () => number) {
  return values[Math.floor(random() * values.length)];
}

function wealthLabel(wealth: number) {
  if (wealth < 0.2) return "Destitute";
  if (wealth < 0.4) return "Modest";
  if (wealth < 0.65) return "Comfortable";
  if (wealth < 0.85) return "Affluent";
  return "Wealthy";
}

export function generateWorld(seed: string, scale: ScaleName): Character[] {
  const random = mulberry32(hashSeed(`${seed}::${scale}`));
  const count = SCALE_COUNTS[scale];
  const characters: Character[] = [];

  for (let index = 0; index < count; index += 1) {
    const culture = choose(CULTURES, random);
    const first = choose(culture.first, random);
    const last = choose(culture.last, random);
    const wealth = random();
    const tiesRequested = Math.max(
      1,
      Math.round(Math.log10(count + 1) * 2.4 + (random() - 0.5) * 3),
    );
    const tiesRealized = Math.min(tiesRequested, 6);
    const fact = choose(FACTS, random);

    const relationships: Relationship[] = [];
    for (
      let relationIndex = 0;
      relationIndex < tiesRealized;
      relationIndex += 1
    ) {
      const partnerCulture = choose(CULTURES, random);
      const partnerName = `${choose(partnerCulture.first, random)} ${choose(partnerCulture.last, random)}`;
      const archetype = choose(ARCHETYPES, random);
      relationships.push({
        name: partnerName,
        archetype: archetype.label,
        bond: choose(BONDS, random),
        strength: choose(STRENGTHS, random),
        ageTag: choose(AGE_TAGS, random),
      });
    }

    characters.push({
      id: index,
      name: `${first} ${last}`,
      culture: culture.name,
      wealth,
      tiesRequested,
      tiesRealized,
      fact,
      relationships,
    });
  }

  return characters;
}

export { wealthLabel };
