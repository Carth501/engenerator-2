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

function buildPairKey(aId: number, bId: number) {
  return aId < bId ? `${aId}:${bId}` : `${bId}:${aId}`;
}

function buildPairAxis(
  seed: string,
  scale: ScaleName,
  pairKey: string,
  axis: string,
) {
  return hashToUnitInterval(
    hashSeed(`${seed}::${scale}::pair::${pairKey}::axis::${axis}`),
  );
}

function relationshipAffinity(owner: Character, candidate: Character) {
  const sameCulture = owner.culture === candidate.culture ? 1 : 0;
  const wealthCloseness = 1 - Math.abs(owner.wealth - candidate.wealth);
  const tieCloseness = 1 - Math.abs(owner.axes.ties - candidate.axes.ties);

  return 0.25 + sameCulture * 0.9 + wealthCloseness * 0.7 + tieCloseness * 0.4;
}

function chooseWeightedPartner(
  owner: Character,
  candidates: Character[],
  selectionValue: number,
) {
  const weightedCandidates = candidates.map((candidate) => ({
    candidate,
    weight: relationshipAffinity(owner, candidate),
  }));

  const totalWeight = weightedCandidates.reduce(
    (sum, entry) => sum + entry.weight,
    0,
  );
  let cursor = selectionValue * totalWeight;

  for (const entry of weightedCandidates) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      return entry.candidate;
    }
  }

  return weightedCandidates[weightedCandidates.length - 1].candidate;
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

export type GenerationStage =
  | "profiles"
  | "relationship-assembly"
  | "complete";

export interface GenerationProgress {
  stage: GenerationStage;
  characters: Character[];
  elapsedMs: number;
}

interface GenerateWorldAsyncOptions {
  onProgress?: (progress: GenerationProgress) => void;
  chunkSize?: number;
  signal?: AbortSignal;
}

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function nextTick() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

function cloneWithoutRelationships(character: Character): Character {
  return {
    ...character,
    tiesRealized: 0,
    tieContract: {
      ...character.tieContract,
      realized: 0,
      shortfall: character.tieContract.requested,
    },
    relationships: [],
  };
}

function defaultChunkSize(scale: ScaleName) {
  if (scale === "Local") return 4;
  if (scale === "Regional") return 6;
  return 9;
}

export function generateWorld(seed: string, scale: ScaleName): Character[] {
  const count = SCALE_COUNTS[scale];
  const characters: Character[] = [];
  const usedIds = new Set<number>();
  const targetTiesById = new Map<number, number>();

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
      `resolved tie contract target: requested ${tieContract.requested}, generation limit ${tieContract.generationLimit}, target realized ${tieContract.realized}`,
    );
    if (tieContract.shortfall > 0) {
      generationLog.push(
        `applied tie shortfall pre-graph: ${tieContract.shortfall}, because realized ties are capped by generation limit`,
      );
    }

    const fact = chooseByAxis(FACTS, axes.fact);
    logChoice(generationLog, "fact", axes.fact, fact);

    const idCandidate = buildDeterministicIdCandidate(seed, scale, index);
    const id = resolveDeterministicId(idCandidate, usedIds, seed, scale, index);
    targetTiesById.set(id, tieContract.realized);

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
      tiesRealized: 0,
      tieContract: {
        requested: tieContract.requested,
        realized: 0,
        generationLimit: tieContract.generationLimit,
        shortfall: tieContract.requested,
      },
      axes,
      fact,
      relationships: [],
      generationLog,
    });
  }

  const charactersById = [...characters].sort((a, b) => a.id - b.id);
  const existingPairs = new Set<string>();

  for (const owner of charactersById) {
    const target = targetTiesById.get(owner.id) ?? 0;

    while (owner.relationships.length < target) {
      const candidates = charactersById.filter((candidate) => {
        if (candidate.id <= owner.id) {
          return false;
        }

        const candidateTarget = targetTiesById.get(candidate.id) ?? 0;
        if (candidate.relationships.length >= candidateTarget) {
          return false;
        }

        return !existingPairs.has(buildPairKey(owner.id, candidate.id));
      });

      if (candidates.length === 0) {
        owner.generationLog.push(
          `stopped relationship generation at ${owner.relationships.length} realized ties because no eligible partner slots remained`,
        );
        break;
      }

      const relationIndex = owner.relationships.length;
      const selectionValue = buildPairAxis(
        seed,
        scale,
        `${owner.id}:${relationIndex}`,
        "partnerSelection",
      );
      const partner = chooseWeightedPartner(owner, candidates, selectionValue);
      const pairKey = buildPairKey(owner.id, partner.id);

      const bondValue = buildPairAxis(seed, scale, pairKey, "bond");
      const strengthValue = buildPairAxis(seed, scale, pairKey, "strength");
      const ageTagValue = buildPairAxis(seed, scale, pairKey, "ageTag");

      const bond = chooseByAxis(BONDS, bondValue);
      const strength = chooseByAxis(STRENGTHS, strengthValue);
      const ageTag = chooseByAxis(AGE_TAGS, ageTagValue);

      const ownerRelationship: Relationship = {
        partnerId: partner.id,
        ownerId: owner.id,
        pairKey,
        name: partner.name,
        bond,
        strength,
        ageTag,
      };

      const partnerRelationship: Relationship = {
        partnerId: owner.id,
        ownerId: owner.id,
        pairKey,
        name: owner.name,
        bond,
        strength,
        ageTag,
      };

      owner.relationships.push(ownerRelationship);
      partner.relationships.push(partnerRelationship);
      existingPairs.add(pairKey);

      owner.generationLog.push(
        `generated relationship ${owner.relationships.length}: partner ${partner.name}, owner id ${owner.id}, pair ${pairKey}, selection value ${formatValue(selectionValue)}, bond ${bond} from value: ${formatValue(bondValue)}, strength ${strength} from value: ${formatValue(strengthValue)}, age tag ${ageTag} from value: ${formatValue(ageTagValue)}`,
      );
      partner.generationLog.push(
        `mirrored relationship from owner id ${owner.id}: partner ${owner.name}, pair ${pairKey}, bond ${bond}, strength ${strength}, age tag ${ageTag}`,
      );
    }
  }

  for (const character of characters) {
    character.relationships.sort((a, b) => a.pairKey.localeCompare(b.pairKey));
    const tiesRealized = character.relationships.length;
    character.tiesRealized = tiesRealized;
    character.tieContract = {
      requested: character.tieContract.requested,
      realized: tiesRealized,
      generationLimit: character.tieContract.generationLimit,
      shortfall: Math.max(0, character.tieContract.requested - tiesRealized),
    };

    if (character.tieContract.shortfall > 0) {
      character.generationLog.push(
        `finalized tie shortfall: ${character.tieContract.shortfall}, requested ${character.tieContract.requested}, realized ${character.tieContract.realized}`,
      );
    }
  }

  return characters;
}

export async function generateWorldAsync(
  seed: string,
  scale: ScaleName,
  options: GenerateWorldAsyncOptions = {},
) {
  const { onProgress, chunkSize = defaultChunkSize(scale), signal } = options;
  const startedAt = nowMs();

  const throwIfAborted = () => {
    if (signal?.aborted) {
      throw new DOMException("Generation aborted", "AbortError");
    }
  };

  const world = generateWorld(seed, scale);

  for (let upperBound = chunkSize; upperBound < world.length + chunkSize; upperBound += chunkSize) {
    throwIfAborted();

    const visibleCount = Math.min(upperBound, world.length);
    if (visibleCount <= 0) {
      continue;
    }

    const partialProfiles = world
      .slice(0, visibleCount)
      .map(cloneWithoutRelationships);

    onProgress?.({
      stage: "profiles",
      characters: partialProfiles,
      elapsedMs: nowMs() - startedAt,
    });

    await nextTick();
  }

  for (let upperBound = chunkSize; upperBound < world.length + chunkSize; upperBound += chunkSize) {
    throwIfAborted();

    const visibleCount = Math.min(upperBound, world.length);
    if (visibleCount <= 0) {
      continue;
    }

    onProgress?.({
      stage: "relationship-assembly",
      characters: world.slice(0, visibleCount),
      elapsedMs: nowMs() - startedAt,
    });

    await nextTick();
  }

  throwIfAborted();
  onProgress?.({
    stage: "complete",
    characters: world,
    elapsedMs: nowMs() - startedAt,
  });

  return world;
}

export { wealthLabel };
