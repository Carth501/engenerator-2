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

function pearsonCorrelation(xs: number[], ys: number[]) {
  const count = xs.length;
  const meanX = xs.reduce((sum, value) => sum + value, 0) / count;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / count;

  let numerator = 0;
  let varianceX = 0;
  let varianceY = 0;

  for (let index = 0; index < count; index += 1) {
    const deltaX = xs[index] - meanX;
    const deltaY = ys[index] - meanY;
    numerator += deltaX * deltaY;
    varianceX += deltaX * deltaX;
    varianceY += deltaY * deltaY;
  }

  return numerator / Math.sqrt(varianceX * varianceY);
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

  it("keeps position axes statistically decorrelated", () => {
    const positionXValues: number[] = [];
    const positionYValues: number[] = [];

    for (let seedIndex = 0; seedIndex < 40; seedIndex += 1) {
      for (const scale of SCALES) {
        const world = generateWorld(`axis-correlation-${seedIndex}`, scale);
        for (const character of world) {
          positionXValues.push(character.axes.positionX);
          positionYValues.push(character.axes.positionY);
        }
      }
    }

    const correlation = pearsonCorrelation(positionXValues, positionYValues);
    expect(Math.abs(correlation)).toBeLessThan(0.1);
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
