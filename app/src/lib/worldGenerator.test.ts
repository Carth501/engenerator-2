import { describe, expect, it } from "vitest";
import type { Character, ScaleName } from "./types";
import { generateWorld, generateWorldAsync } from "./worldGenerator";

const SCALES: ScaleName[] = ["Local", "Regional", "Continental"];
const TEST_SEED = "determinism-gate-01";

function pairKeyFor(a: number, b: number) {
  const low = Math.min(a, b);
  const high = Math.max(a, b);
  return `${low}:${high}`;
}

function indexById(characters: Character[]) {
  return new Map(characters.map((character) => [character.id, character]));
}

describe("generateWorld deterministic contract", () => {
  it("returns identical sync results for repeated calls with same input", () => {
    for (const scale of SCALES) {
      const first = generateWorld(TEST_SEED, scale);
      const second = generateWorld(TEST_SEED, scale);
      expect(second).toEqual(first);
    }
  });

  it("produces unique character ids", () => {
    for (const scale of SCALES) {
      const world = generateWorld(TEST_SEED, scale);
      const idSet = new Set(world.map((character) => character.id));
      expect(idSet.size).toBe(world.length);
    }
  });

  it("enforces symmetric edges with lower-id ownership", () => {
    for (const scale of SCALES) {
      const world = generateWorld(TEST_SEED, scale);
      const byId = indexById(world);
      const relationCountByPair = new Map<string, number>();

      for (const character of world) {
        expect(character.tieContract.realized).toBe(
          character.relationships.length,
        );
        expect(character.tiesRealized).toBe(character.relationships.length);
        expect(character.tieContract.shortfall).toBe(
          Math.max(
            0,
            character.tieContract.requested - character.relationships.length,
          ),
        );

        for (const relationship of character.relationships) {
          const expectedPairKey = pairKeyFor(
            character.id,
            relationship.partnerId,
          );
          expect(relationship.pairKey).toBe(expectedPairKey);
          expect(relationship.ownerId).toBe(
            Math.min(character.id, relationship.partnerId),
          );

          const partner = byId.get(relationship.partnerId);
          expect(partner).toBeDefined();

          const mirror = partner?.relationships.find(
            (candidate) =>
              candidate.partnerId === character.id &&
              candidate.pairKey === relationship.pairKey,
          );

          expect(mirror).toBeDefined();
          expect(mirror?.bond).toBe(relationship.bond);
          expect(mirror?.strength).toBe(relationship.strength);
          expect(mirror?.ageTag).toBe(relationship.ageTag);
          expect(mirror?.ownerId).toBe(relationship.ownerId);

          relationCountByPair.set(
            relationship.pairKey,
            (relationCountByPair.get(relationship.pairKey) ?? 0) + 1,
          );
        }
      }

      for (const count of relationCountByPair.values()) {
        expect(count).toBe(2);
      }
    }
  });
});

describe("generateWorldAsync orchestration", () => {
  it("matches sync output and emits staged progress", async () => {
    const scale: ScaleName = "Continental";
    const syncWorld = generateWorld(TEST_SEED, scale);

    const seenStages: string[] = [];
    const asyncWorld = await generateWorldAsync(TEST_SEED, scale, {
      chunkSize: 7,
      onProgress: (progress) => {
        seenStages.push(progress.stage);
      },
    });

    expect(asyncWorld).toEqual(syncWorld);
    expect(seenStages[0]).toBe("profiles");
    expect(seenStages).toContain("relationship-assembly");
    expect(seenStages[seenStages.length - 1]).toBe("complete");
  });
});
