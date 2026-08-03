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

const MAX_RELATIONSHIPS_PER_CHARACTER = 6;

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

function formatValue(value: number) {
  return value.toFixed(5);
}

function hashToUnitInterval(hash: number) {
  return hash / 4294967296;
}

function buildCharacterAxis(
  seed: string,
  scale: ScaleName,
  index: number,
  axis: string,
) {
  return hashToUnitInterval(
    hashSeed(`${seed}::${scale}::character::${index}::axis::${axis}`),
  );
}

function chooseByAxis<T>(values: T[], axisValue: number) {
  return values[Math.floor(axisValue * values.length)];
}

function logChoice(
  log: string[],
  label: string,
  value: number,
  result: string,
) {
  log.push(`generated ${label}: ${result}, from value: ${formatValue(value)}`);
}

function logCount(log: string[], label: string, value: number, result: number) {
  log.push(`generated ${label}: ${result}, from value: ${formatValue(value)}`);
}

function logRelationship(
  log: string[],
  relationIndex: number,
  details: {
    partnerCulture: string;
    partnerCultureValue: number;
    partnerFirst: string;
    partnerFirstValue: number;
    partnerLast: string;
    partnerLastValue: number;
    bond: string;
    bondValue: number;
    strength: string;
    strengthValue: number;
    ageTag: string;
    ageTagValue: number;
  },
) {
  log.push(
    `generated relationship ${relationIndex + 1}: partner ${details.partnerFirst} ${details.partnerLast}, culture ${details.partnerCulture} from value: ${formatValue(details.partnerCultureValue)}, bond ${details.bond} from value: ${formatValue(details.bondValue)}, strength ${details.strength} from value: ${formatValue(details.strengthValue)}, age tag ${details.ageTag} from value: ${formatValue(details.ageTagValue)}`,
  );
}

function wealthLabel(wealth: number) {
  if (wealth < 0.2) return "Destitute";
  if (wealth < 0.4) return "Modest";
  if (wealth < 0.65) return "Comfortable";
  if (wealth < 0.85) return "Affluent";
  return "Wealthy";
}

function buildDeterministicIdCandidate(
  seed: string,
  scale: ScaleName,
  index: number,
) {
  return hashSeed(`${seed}::${scale}::character::${index}`);
}

function resolveDeterministicId(
  candidate: number,
  usedIds: Set<number>,
  seed: string,
  scale: ScaleName,
  index: number,
) {
  let resolved = candidate;
  let attempt = 0;

  while (usedIds.has(resolved)) {
    attempt += 1;
    resolved = hashSeed(
      `${seed}::${scale}::character::${index}::${resolved}::${attempt}`,
    );
  }

  usedIds.add(resolved);
  return resolved;
}

function resolveTieContract(requested: number, generationLimit: number) {
  const realized = Math.min(requested, generationLimit);
  return {
    requested,
    realized,
    generationLimit,
    shortfall: Math.max(0, requested - realized),
  };
}

function projectRequestedTies(tiesAxis: number, populationCount: number) {
  return Math.max(
    1,
    Math.round(Math.log10(populationCount + 1) * 2.4 + (tiesAxis - 0.5) * 3),
  );
}

export function generateWorld(seed: string, scale: ScaleName): Character[] {
  const count = SCALE_COUNTS[scale];
  const characters: Character[] = [];
  const usedIds = new Set<number>();

  for (let index = 0; index < count; index += 1) {
    const generationLog: string[] = [];

    const axes = {
      culture: buildCharacterAxis(seed, scale, index, "culture"),
      givenName: buildCharacterAxis(seed, scale, index, "givenName"),
      familyName: buildCharacterAxis(seed, scale, index, "familyName"),
      wealth: buildCharacterAxis(seed, scale, index, "wealth"),
      ties: buildCharacterAxis(seed, scale, index, "ties"),
      fact: buildCharacterAxis(seed, scale, index, "fact"),
    };

    generationLog.push(
      `generated axis values: culture ${formatValue(axes.culture)}, givenName ${formatValue(axes.givenName)}, familyName ${formatValue(axes.familyName)}, wealth ${formatValue(axes.wealth)}, ties ${formatValue(axes.ties)}, fact ${formatValue(axes.fact)}`,
    );

    const culture = chooseByAxis(CULTURES, axes.culture);
    logChoice(generationLog, "culture", axes.culture, culture.name);

    const first = chooseByAxis(culture.first, axes.givenName);
    logChoice(generationLog, "given name", axes.givenName, first);

    const last = chooseByAxis(culture.last, axes.familyName);
    logChoice(generationLog, "family name", axes.familyName, last);

    const wealth = axes.wealth;
    generationLog.push(
      `generated wealth: ${wealthLabel(wealth)}, from value: ${formatValue(wealth)}`,
    );

    const tiesRequested = projectRequestedTies(axes.ties, count);
    logCount(generationLog, "requested ties", axes.ties, tiesRequested);

    const tieContract = resolveTieContract(
      tiesRequested,
      MAX_RELATIONSHIPS_PER_CHARACTER,
    );
    generationLog.push(
      `resolved tie contract: requested ${tieContract.requested}, generation limit ${tieContract.generationLimit}, realized ${tieContract.realized}`,
    );
    if (tieContract.shortfall > 0) {
      generationLog.push(
        `applied tie shortfall: ${tieContract.shortfall}, because realized ties are capped by generation limit`,
      );
    }

    const fact = chooseByAxis(FACTS, axes.fact);
    logChoice(generationLog, "fact", axes.fact, fact);

    const relationshipRandom = mulberry32(
      hashSeed(`${seed}::${scale}::character::${index}::relationships`),
    );

    const relationships: Relationship[] = [];
    for (
      let relationIndex = 0;
      relationIndex < tieContract.realized;
      relationIndex += 1
    ) {
      const partnerCultureValue = relationshipRandom();
      const partnerCulture =
        CULTURES[Math.floor(partnerCultureValue * CULTURES.length)];

      const partnerFirstValue = relationshipRandom();
      const partnerFirst =
        partnerCulture.first[
          Math.floor(partnerFirstValue * partnerCulture.first.length)
        ];

      const partnerLastValue = relationshipRandom();
      const partnerLast =
        partnerCulture.last[
          Math.floor(partnerLastValue * partnerCulture.last.length)
        ];

      const bondValue = relationshipRandom();
      const bond = BONDS[Math.floor(bondValue * BONDS.length)];

      const strengthValue = relationshipRandom();
      const strength = STRENGTHS[Math.floor(strengthValue * STRENGTHS.length)];

      const ageTagValue = relationshipRandom();
      const ageTag = AGE_TAGS[Math.floor(ageTagValue * AGE_TAGS.length)];

      relationships.push({
        name: `${partnerFirst} ${partnerLast}`,
        bond,
        strength,
        ageTag,
      });

      logRelationship(generationLog, relationIndex, {
        partnerCulture: partnerCulture.name,
        partnerCultureValue,
        partnerFirst,
        partnerFirstValue,
        partnerLast,
        partnerLastValue,
        bond,
        bondValue,
        strength,
        strengthValue,
        ageTag,
        ageTagValue,
      });
    }

    const tiesRealized = relationships.length;
    if (tiesRealized !== tieContract.realized) {
      generationLog.push(
        `corrected realized ties from ${tieContract.realized} to ${tiesRealized}, based on materialized relationship count`,
      );
    }

    const tieContractFinal = {
      requested: tieContract.requested,
      realized: tiesRealized,
      generationLimit: tieContract.generationLimit,
      shortfall: Math.max(0, tieContract.requested - tiesRealized),
    };

    const idCandidate = buildDeterministicIdCandidate(seed, scale, index);
    const id = resolveDeterministicId(idCandidate, usedIds, seed, scale, index);

    generationLog.push(`generated id: ${id}, from value: ${idCandidate}`);
    if (id !== idCandidate) {
      generationLog.push(
        `resolved id collision: candidate ${idCandidate} rehashed deterministically to ${id}`,
      );
    }

    characters.push({
      id,
      name: `${first} ${last}`,
      culture: culture.name,
      wealth,
      tiesRequested,
      tiesRealized,
      tieContract: tieContractFinal,
      axes,
      fact,
      relationships,
      generationLog,
    });
  }

  return characters;
}

export { wealthLabel };
