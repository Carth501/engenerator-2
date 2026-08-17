import { createXXHash3 } from "hash-wasm";
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

const SCALE_DISTANCES: Record<ScaleName, number> = {
  Local: 15,
  Regional: 100,
  Continental: 3000,
};

const MAX_RELATIONSHIPS_PER_CHARACTER = 6;

const CHARACTER_AXIS_STREAMS = {
  wealth: 0x243f6a88,
  "position-x": 0x85a308d3,
  "position-y": 0x13198a2e,
  "abstract-1": 0x03707344,
  "abstract-2": 0xa4093822,
  "abstract-3": 0x299f31d0,
} as const;

const PAIR_AXIS_STREAMS = {
  partnerSelection: 0x082efa98,
  bond: 0xec4e6c89,
  strength: 0x452821e6,
  ageTag: 0x38d01377,
} as const;

type CharacterAxisName = keyof typeof CHARACTER_AXIS_STREAMS;
type PairAxisName = keyof typeof PAIR_AXIS_STREAMS;

const xxHash3 = await createXXHash3();

function digestToUint32(digest: Uint8Array): number {
  const view = new DataView(
    digest.buffer,
    digest.byteOffset,
    digest.byteLength,
  );
  const low = view.getUint32(0, true);
  const high = view.getUint32(4, true);
  return (low ^ high) >>> 0;
}

function hashSeed(input: string): number {
  xxHash3.init();
  xxHash3.update(input);
  return digestToUint32(xxHash3.digest("binary"));
}

function formatValue(value: number) {
  return value.toFixed(5);
}

function hashToUnitInterval(hash: number) {
  return hash / 4294967296;
}

function mixSeed32(value: number) {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x85ebca6b);
  mixed ^= mixed >>> 13;
  mixed = Math.imul(mixed, 0xc2b2ae35);
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

function deriveUnitFromBaseSeed(baseSeed: number, streamId: number) {
  return hashToUnitInterval(mixSeed32((baseSeed + streamId) >>> 0));
}

function buildCharacterBaseSeed(seed: string, scale: ScaleName, index: number) {
  return hashSeed(`${seed}::${scale}::character::${index}`);
}

function buildCharacterAxis(
  seed: string,
  scale: ScaleName,
  index: number,
  axis: CharacterAxisName,
) {
  const baseSeed = buildCharacterBaseSeed(seed, scale, index);
  return deriveUnitFromBaseSeed(baseSeed, CHARACTER_AXIS_STREAMS[axis]);
}

function buildCharacterSpatialAxis(
  seed: string,
  scale: ScaleName,
  index: number,
  axis: CharacterAxisName,
) {
  const baseSeed = buildCharacterAxis(seed, scale, index, axis);
  return baseSeed * SCALE_DISTANCES[scale];
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
  axis: PairAxisName,
) {
  const baseSeed = hashSeed(`${seed}::${scale}::pair::${pairKey}`);
  return deriveUnitFromBaseSeed(baseSeed, PAIR_AXIS_STREAMS[axis]);
}

function relationshipAffinity(owner: Character, candidate: Character) {
  const wealthCloseness =
    1 - Math.abs(owner.axes.wealth - candidate.axes.wealth);
  const positionXCloseness =
    1 - Math.abs(owner.axes.positionX - candidate.axes.positionX);
  const positionYCloseness =
    1 - Math.abs(owner.axes.positionY - candidate.axes.positionY);
  const abstract1Closeness =
    1 - Math.abs(owner.axes.abstract1 - candidate.axes.abstract1);
  const abstract2Closeness =
    1 - Math.abs(owner.axes.abstract2 - candidate.axes.abstract2);
  const abstract3Closeness =
    1 - Math.abs(owner.axes.abstract3 - candidate.axes.abstract3);

  const weightedCloseness =
    wealthCloseness * 1.2 +
    positionXCloseness * 1 +
    positionYCloseness * 1 +
    abstract1Closeness * 0.5 +
    abstract2Closeness * 0.5 +
    abstract3Closeness * 0.5;
  const normalizedCloseness = weightedCloseness / 4.7;

  // Ensure every candidate retains a non-zero selection chance.
  return 0.2 + normalizedCloseness;
}

function deriveCultureAxis(positionX: number, positionY: number) {
  return (positionX + positionY) / 2;
}

function deriveSecondaryNameAxis(axis: number) {
  return (axis * 0.6180339887498949 + 0.2718281828459045) % 1;
}

function deriveFactAxis(axes: Character["axes"]) {
  return (axes.abstract2 * 0.5 + axes.abstract3 * 0.5) % 1;
}

function deriveTiesAxis(axes: Character["axes"]) {
  return (
    (axes.abstract1 * 0.36 + axes.abstract2 * 0.34 + axes.abstract3 * 0.3) % 1
  );
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

export type GenerationStage = "profiles" | "relationship-assembly" | "complete";

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

function createCharacterProfile(
  seed: string,
  scale: ScaleName,
  index: number,
  populationCount: number,
  usedIds: Set<number>,
) {
  const generationLog: string[] = [];

  const axes = {
    wealth: buildCharacterAxis(seed, scale, index, "wealth"),
    positionX: buildCharacterSpatialAxis(seed, scale, index, "position-x"),
    positionY: buildCharacterSpatialAxis(seed, scale, index, "position-y"),
    abstract1: buildCharacterAxis(seed, scale, index, "abstract-1"),
    abstract2: buildCharacterAxis(seed, scale, index, "abstract-2"),
    abstract3: buildCharacterAxis(seed, scale, index, "abstract-3"),
  };

  generationLog.push(
    `generated axis values: wealth ${formatValue(axes.wealth)}, position-x ${formatValue(axes.positionX)}, position-y ${formatValue(axes.positionY)}, abstract-1 ${formatValue(axes.abstract1)}, abstract-2 ${formatValue(axes.abstract2)}, abstract-3 ${formatValue(axes.abstract3)}`,
  );

  // This requires the "Culture Field" to be created. This will be needed before
  // characters are generated. It should be perlin noise map for each
  // culture, with centralized peaks for each culture, and decay further out.
  // For each character, the probability of their culture should be the ratio
  // between the cultures with values greater than 0 at their position, with
  // a bonus given to the highest (guarenteeing that there is one above 0).
  const cultureAxis = 0.5;
  const culture = chooseByAxis(CULTURES, cultureAxis);
  logChoice(generationLog, "culture", cultureAxis, culture.name);

  const givenNameAxis = axes.abstract1;
  const first = chooseByAxis(culture.first, givenNameAxis);
  logChoice(generationLog, "given name", givenNameAxis, first);

  const familyNameAxis = deriveSecondaryNameAxis(axes.abstract1);
  const last = chooseByAxis(culture.last, familyNameAxis);
  logChoice(generationLog, "family name", familyNameAxis, last);

  const wealth = axes.wealth;
  generationLog.push(
    `generated wealth: ${wealthLabel(wealth)}, from value: ${formatValue(wealth)}`,
  );

  const tiesAxis = deriveTiesAxis(axes);
  const tiesRequested = projectRequestedTies(tiesAxis, populationCount);
  logCount(generationLog, "requested ties", tiesAxis, tiesRequested);

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

  const factAxis = deriveFactAxis(axes);
  const fact = chooseByAxis(FACTS, factAxis);
  logChoice(generationLog, "fact", factAxis, fact);

  const idCandidate = buildDeterministicIdCandidate(seed, scale, index);
  const id = resolveDeterministicId(idCandidate, usedIds, seed, scale, index);

  generationLog.push(`generated id: ${id}, from value: ${idCandidate}`);
  if (id !== idCandidate) {
    generationLog.push(
      `resolved id collision: candidate ${idCandidate} rehashed deterministically to ${id}`,
    );
  }

  const character: Character = {
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
  };

  return {
    character,
    targetRealizedTies: tieContract.realized,
  };
}

export function generateWorld(seed: string, scale: ScaleName): Character[] {
  const count = SCALE_COUNTS[scale];
  const characters: Character[] = [];
  const usedIds = new Set<number>();
  const targetTiesById = new Map<number, number>();

  for (let index = 0; index < count; index += 1) {
    const { character, targetRealizedTies } = createCharacterProfile(
      seed,
      scale,
      index,
      count,
      usedIds,
    );

    targetTiesById.set(character.id, targetRealizedTies);
    characters.push(character);
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

  for (
    let upperBound = chunkSize;
    upperBound < world.length + chunkSize;
    upperBound += chunkSize
  ) {
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

  for (
    let upperBound = chunkSize;
    upperBound < world.length + chunkSize;
    upperBound += chunkSize
  ) {
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
