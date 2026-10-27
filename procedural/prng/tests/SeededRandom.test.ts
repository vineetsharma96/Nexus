import { describe, expect, test } from "bun:test";
import { SeededRandom } from "../SeededRandom";

describe("SeededRandom", () => {
  test("generates same sequence for same seed", () => {
    const rng1 = new SeededRandom(123);
    const rng2 = new SeededRandom(123);

    for (let i = 0; i < 10; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  test("generates different sequences for different seeds", () => {
    const rng1 = new SeededRandom(123);
    const rng2 = new SeededRandom(456);

    expect(rng1.next()).not.toBe(rng2.next());
  });

  test("next() returns values in [0, 1)", () => {
    const rng = new SeededRandom();

    for (let i = 0; i < 100; i++) {
      const val = rng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  test("range() returns values in [min, max)", () => {
    const rng = new SeededRandom();
    const min = 5;
    const max = 10;

    for (let i = 0; i < 100; i++) {
      const val = rng.range(min, max);
      expect(val).toBeGreaterThanOrEqual(min);
      expect(val).toBeLessThan(max);
    }
  });

  test("rangeInt() returns integers in [min, max]", () => {
    const rng = new SeededRandom();
    const min = 1;
    const max = 5;

    for (let i = 0; i < 100; i++) {
      const val = rng.rangeInt(min, max);
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(min);
      expect(val).toBeLessThanOrEqual(max);
    }
  });

  test("boolean() respects probability", () => {
    const rng = new SeededRandom(12345);

    let trueCount = 0;
    const iters = 1000;

    for (let i = 0; i < iters; i++) {
      if (rng.boolean(0.75)) {
        trueCount++;
      }
    }

    // Should be roughly 75%
    const ratio = trueCount / iters;
    expect(ratio).toBeGreaterThan(0.7);
    expect(ratio).toBeLessThan(0.8);
  });

  test("pick() selects from array", () => {
    const rng = new SeededRandom();
    const arr = ["a", "b", "c", "d"];

    for (let i = 0; i < 20; i++) {
      const val = rng.pick(arr);
      expect(arr).toContain(val);
    }
  });
});
